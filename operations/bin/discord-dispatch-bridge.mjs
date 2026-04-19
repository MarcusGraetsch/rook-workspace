#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const ROOT_DIR = '/root/.openclaw';
const WORKSPACE_DIR = path.join(ROOT_DIR, 'workspace');
const OPERATIONS_DIR = path.join(WORKSPACE_DIR, 'operations');
const RUNTIME_ROOT = process.env.ROOK_RUNTIME_ROOT || path.join(ROOT_DIR, 'runtime');
const RUNTIME_OPERATIONS_DIR =
  process.env.ROOK_RUNTIME_OPERATIONS_DIR || path.join(RUNTIME_ROOT, 'operations');
const HEALTH_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'health');
const STATE_FILE = path.join(HEALTH_DIR, 'discord-dispatch-state.json');
const WRAPPER_PATH = path.join(OPERATIONS_DIR, 'bin', 'dispatch-canonical-task.mjs');
const COMMAND_CHANNEL_ID = '1487786269542056071';
const COMMAND_GUILD_ID = '1487760796141359276';
const SESSION_DIRS = [
  path.join(ROOT_DIR, 'agents', 'dispatcher', 'sessions'),
  path.join(ROOT_DIR, 'agents', 'rook', 'sessions'),
];
const MAX_SCANNED_FILES = 12;
const MAX_PROCESSED_IDS = 500;
const VALID_TASK_ID = /\b([a-z0-9]+-\d{4,})\b/i;
const DISPATCH_TRIGGER = /(?:^|\s)(?:\/dispatch\b|dispatch(?:\s+canonical\s+task)?\b)/i;
const REFINE_TRIGGER = /(?:^|\s)\/refine\b/i;
const TASKS_DIR = path.join(WORKSPACE_DIR, 'operations', 'tasks');
const GATEWAY_BASE_URL = process.env.ROOK_GATEWAY_BASE_URL || 'http://127.0.0.1:18789';
const OPENCLAW_CONFIG_PATH = path.join(ROOT_DIR, 'openclaw.json');
const HOOK_MODEL = 'minimax/MiniMax-M2.7';
const HOOK_THINKING = 'low';
const DEFAULT_TIMEOUT_SECONDS = 120;

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function loadHookConfig() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const hooks = config?.hooks;
  if (!hooks?.enabled) {
    throw new Error('OpenClaw hooks are disabled in openclaw.json.');
  }
  if (!hooks?.token) {
    throw new Error('OpenClaw hooks.token is missing in openclaw.json.');
  }
  const hookPath = String(hooks.path || '/hooks').replace(/\/+$/, '');
  return {
    token: String(hooks.token),
    agentUrl: `${GATEWAY_BASE_URL}${hookPath}/agent`,
  };
}

async function findTaskFile(taskId) {
  let projectDirs = [];
  try {
    projectDirs = await fs.readdir(TASKS_DIR);
  } catch {
    return null;
  }
  for (const projectId of projectDirs) {
    const candidate = path.join(TASKS_DIR, projectId, `${taskId}.json`);
    try {
      await fs.access(candidate);
      return { filePath: candidate, projectId };
    } catch {
      // Continue search.
    }
  }
  return null;
}

function parseRefineRequest(event) {
  if (event?.type !== 'message' || event?.message?.role !== 'user') return null;
  const raw = flattenContent(event);
  if (!raw) return null;
  const metadata = extractMetadata(raw);
  const commandText = extractCommandText(raw);
  if (!metadata.messageId || !commandText) return null;
  if (metadata.groupChannel !== '#agent-commands') return null;
  if (metadata.groupSpace && metadata.groupSpace !== COMMAND_GUILD_ID) return null;
  if (!REFINE_TRIGGER.test(commandText)) return null;
  const taskId = commandText.match(VALID_TASK_ID)?.[1] || null;
  if (!taskId) return null;
  return {
    messageId: metadata.messageId,
    taskId: taskId.toLowerCase(),
    commandText,
  };
}

async function postHookWithCurl(agentUrl, token, payload) {
  return new Promise((resolve) => {
    const child = spawn('curl', [
      '-s',
      '-X', 'POST',
      '-H', `Authorization: Bearer ${token}`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify(payload),
      agentUrl,
    ]);
    let bodyText = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { bodyText += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => {
      resolve({ ok: code === 0, bodyText, stderr, status: 200 });
    });
  });
}

async function waitForHookResult(agentId, sessionKey, timeoutMs = DEFAULT_TIMEOUT_SECONDS * 1000) {
  const sessionsDir = path.join(ROOT_DIR, 'agents', agentId, 'sessions');
  const indexPath = path.join(sessionsDir, 'sessions.json');
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    let index;
    try {
      index = await readJson(indexPath);
    } catch {
      index = null;
    }
    const storeKey = `agent:${agentId}:${sessionKey}`;
    const entry = index?.[storeKey];
    const sessionId = entry?.sessionId;
    if (sessionId) {
      const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
      try {
        const raw = await fs.readFile(transcriptPath, 'utf8');
        const lines = raw.split('\n').filter(Boolean);
        const assistantLines = lines.filter(l => {
          try {
            const e = JSON.parse(l);
            return e.type === 'assistant';
          } catch { return false; }
        });
        if (assistantLines.length > 0) {
          const last = JSON.parse(assistantLines[assistantLines.length - 1]);
          return {
            ok: true,
            code: 0,
            stdout: extractTextFromMessage(last),
            stderr: '',
            sessionId,
          };
        }
      } catch { /* continue waiting */ }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return { ok: false, code: 124, stdout: '', stderr: 'hook session timed out', sessionId: null };
}

function extractTextFromMessage(msg) {
  const content = Array.isArray(msg?.message?.content) ? msg.message.content : [];
  return content.filter(e => e?.type === 'text').map(e => String(e.text || '')).join('\n').trim();
}

async function invokeRookForRefinement(task) {
  const hookConfig = await loadHookConfig();
  const sessionKey = `hook:refine:${task.task_id}:${randomUUID().slice(0, 8)}`;
  const refinePrompt = [
    `Task ${task.task_id} is in INTAKE status and needs refinement before it can move to READY.`,
    ``,
    `Title: ${task.title || 'Untitled'}`,
    `Description: ${task.description || 'No description provided.'}`,
    ``,
    `Please review this task and produce a structured refinement plan. For ambiguous tasks, ask clarifying questions in your response.`,
    ``,
    `Your response must include a JSON block with this exact structure:`,
    `{`,
    `  "scope": ["item 1", "item 2", ...],  // 3-5 scope items`,
    `  "approach": "One sentence describing the overall approach",`,
    `  "steps": [`,
    `    { "title": "Step 1 title", "owner": "agent-name" },`,
    `    ...`,
    `  ],  // 3-5 steps`,
    `  "acceptance_criteria": [`,
    `    { "description": "Criteria 1" },`,
    `    ...`,
    `  ],  // 3-5 criteria`,
    `  "priority": "high|medium|low",`,
    `  "recommended_assigned_agent": "agent-name",`,
    `  "clarifying_questions": ["question 1", ...]  // only if ambiguous, empty array otherwise`,
    `}`,
    ``,
    `Canonical file: ${path.join(TASKS_DIR, task.project_id, `${task.task_id}.json`)}`,
    `Working repo: /root/.openclaw/workspace/repos/rook-workspace`,
  ].join('\n');

  const payload = {
    message: refinePrompt,
    name: 'Refine-Dispatcher',
    agentId: 'rook',
    sessionKey,
    wakeMode: 'now',
    deliver: false,
    model: HOOK_MODEL,
    thinking: HOOK_THINKING,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  };

  let response;
  let bodyText = '';
  try {
    response = await fetch(hookConfig.agentUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hookConfig.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const curlFallback = await postHookWithCurl(hookConfig.agentUrl, hookConfig.token, payload);
    if (!curlFallback.ok) {
      throw new Error(`hook dispatch failed: ${error instanceof Error ? error.message : String(error)}; curl fallback failed: ${curlFallback.stderr}`);
    }
    bodyText = curlFallback.bodyText;
    response = { ok: true, status: 200, text: async () => bodyText };
  }

  if (!bodyText) {
    bodyText = await response.text();
  }
  if (!response.ok) {
    throw new Error(`hook returned HTTP ${response.status}: ${bodyText}`);
  }

  const result = await waitForHookResult('rook', sessionKey);
  return { sessionKey, result, bodyText };
}

function parseRefinementFromResponse(responseText) {
  const jsonStart = responseText.indexOf('{');
  if (jsonStart < 0) return null;
  const jsonEnd = responseText.lastIndexOf('}');
  if (jsonEnd < 0) return null;
  try {
    return JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

async function refineTask(taskId) {
  const found = await findTaskFile(taskId);
  if (!found) {
    return { ok: false, error: 'task_not_found', taskId };
  }

  const task = await readJson(found.filePath);
  if (!task) {
    return { ok: false, error: 'could_not_read_task', taskId };
  }

  const { result, bodyText } = await invokeRookForRefinement(task);
  const plan = parseRefinementFromResponse(result.stdout || bodyText);

  if (!plan) {
    return { ok: false, error: 'could_not_parse_plan', taskId, rawOutput: result.stdout || bodyText };
  }

  // Build plan object matching existing schema
  const planUpdate = {
    approach: plan.approach || null,
    scope: Array.isArray(plan.scope) ? plan.scope : [],
    steps: Array.isArray(plan.steps) ? plan.steps.map((s, i) => ({
      id: String(i + 1),
      title: s.title || String(s),
      owner: s.owner || 'rook',
      completed: false,
    })) : [],
    acceptance_criteria: Array.isArray(plan.acceptance_criteria) ? plan.acceptance_criteria.map((ac, i) => ({
      id: String(i + 1),
      description: typeof ac === 'string' ? ac : (ac.description || String(ac)),
      met: null,
    })) : [],
    priority: plan.priority || task.priority || 'medium',
    context: null,
    risks: [],
    planned_by: 'rook',
    planned_at: new Date().toISOString(),
  };

  // Update task
  const updatedTask = {
    ...task,
    plan: planUpdate,
    status: 'ready',
    workflow_stage: 'ready',
    assigned_agent: plan.recommended_assigned_agent || task.assigned_agent || 'rook',
    priority: plan.priority || task.priority || 'medium',
  };

  // Write back
  await fs.writeFile(found.filePath, `${JSON.stringify(updatedTask, null, 2)}\n`, 'utf8');

  // Build summary for Discord
  const summary = [
    `[refine][task:${taskId}] refined and moved to ready`,
    `approach: ${planUpdate.approach || 'n/a'}`,
    `priority: ${planUpdate.priority}`,
    `assigned_agent: ${updatedTask.assigned_agent}`,
    `steps: ${planUpdate.steps.length} defined`,
    `scope: ${planUpdate.scope.slice(0, 3).join('; ')}${planUpdate.scope.length > 3 ? '...' : ''}`,
  ];

  if (plan.clarifying_questions && plan.clarifying_questions.length > 0) {
    summary.push('');
    summary.push('clarifying_questions:');
    plan.clarifying_questions.forEach(q => summary.push(`  - ${q}`));
  }

  return { ok: true, taskId, plan: planUpdate, summary, clarifyingQuestions: plan.clarifying_questions || [] };
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function flattenContent(event) {
  const content = Array.isArray(event?.message?.content) ? event.message.content : [];
  return content
    .filter((entry) => entry?.type === 'text')
    .map((entry) => String(entry.text || ''))
    .join('\n');
}

function extractMetadata(raw) {
  const messageId = raw.match(/"message_id"\s*:\s*"([^"]+)"/)?.[1] || null;
  const groupChannel = raw.match(/"group_channel"\s*:\s*"([^"]+)"/)?.[1] || null;
  const groupSpace = raw.match(/"group_space"\s*:\s*"([^"]+)"/)?.[1] || null;
  return { messageId, groupChannel, groupSpace };
}

function extractCommandText(raw) {
  let text = String(raw || '');
  const untrustedIndex = text.indexOf('Untrusted context');
  if (untrustedIndex >= 0) text = text.slice(0, untrustedIndex);
  text = text.replace(/Conversation info \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '');
  text = text.replace(/Sender \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '');
  return text.trim();
}

function parseDispatchRequest(event) {
  if (event?.type !== 'message' || event?.message?.role !== 'user') return null;
  const raw = flattenContent(event);
  if (!raw) return null;
  const metadata = extractMetadata(raw);
  const commandText = extractCommandText(raw);
  if (!metadata.messageId || !commandText) return null;
  if (metadata.groupChannel !== '#agent-commands') return null;
  if (metadata.groupSpace && metadata.groupSpace !== COMMAND_GUILD_ID) return null;
  if (!DISPATCH_TRIGGER.test(commandText)) return null;
  const taskId = commandText.match(VALID_TASK_ID)?.[1] || null;
  if (!taskId) return null;
  return {
    messageId: metadata.messageId,
    taskId: taskId.toLowerCase(),
    commandText,
  };
}

async function listRecentTranscriptFiles(dirPath) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const filePath = path.join(dirPath, entry.name);
    try {
      const stat = await fs.stat(filePath);
      files.push({ filePath, mtimeMs: stat.mtimeMs });
    } catch {
      // Ignore disappearing files.
    }
  }
  return files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, MAX_SCANNED_FILES)
    .map((entry) => entry.filePath);
}

async function collectRequests() {
  const requests = [];
  for (const dirPath of SESSION_DIRS) {
    for (const filePath of await listRecentTranscriptFiles(dirPath)) {
      let raw = '';
      try {
        raw = await fs.readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          const dispatchReq = parseDispatchRequest(event);
          if (dispatchReq) requests.push({ ...dispatchReq, filePath, type: 'dispatch' });
          const refineReq = parseRefineRequest(event);
          if (refineReq) requests.push({ ...refineReq, filePath, type: 'refine' });
        } catch {
          // Ignore malformed lines.
        }
      }
    }
  }
  const deduped = new Map();
  for (const request of requests) {
    if (!deduped.has(request.messageId)) deduped.set(request.messageId, request);
  }
  return Array.from(deduped.values()).sort((a, b) => a.messageId.localeCompare(b.messageId));
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT_DIR, env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function buildAckMessage(taskId, payload) {
  const after = payload?.after || {};
  if (payload?.accepted) {
    return [
      `[dispatcher][task:${taskId}] accepted`,
      `status: ${after.status || 'unknown'}`,
      `claimed_by: ${after.claimed_by || 'none'}`,
      `assigned_agent: ${after.assigned_agent || 'unknown'}`,
    ].join('\n');
  }
  return [
    `[dispatcher][task:${taskId}] not accepted`,
    `status: ${after.status || 'unknown'}`,
    `claimed_by: ${after.claimed_by || 'none'}`,
    `reason: ${after.failure_reason || payload?.dispatch?.stderr || payload?.dispatch?.stdout || 'dispatcher made no claim change'}`,
  ].join('\n');
}

async function sendDiscordAck(message) {
  return runCommand('openclaw', [
    'message',
    'send',
    '--channel',
    'discord',
    '--target',
    `channel:${COMMAND_CHANNEL_ID}`,
    '--message',
    message,
  ]);
}

async function dispatchTask(taskId) {
  const result = await runCommand('node', [WRAPPER_PATH, taskId]);
  let payload = null;
  try {
    payload = JSON.parse(result.stdout || '{}');
  } catch {
    payload = {
      ok: result.ok,
      accepted: false,
      task_id: taskId,
      after: {
        status: 'unknown',
        claimed_by: null,
        assigned_agent: null,
        failure_reason: result.stderr || result.stdout || 'wrapper output was not valid JSON',
      },
      dispatch: {
        ok: result.ok,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    };
  }
  return { result, payload };
}

async function main() {
  const state = await readJson(STATE_FILE, {
    processed_message_ids: [],
    processed: [],
    updated_at: null,
  });
  const processedIds = new Set(Array.isArray(state.processed_message_ids) ? state.processed_message_ids : []);
  const requests = await collectRequests();
  const handled = Array.isArray(state.processed) ? state.processed.slice(-MAX_PROCESSED_IDS) : [];

  for (const request of requests) {
    if (processedIds.has(request.messageId)) continue;

    let ack;
    let handledEntry;

    if (request.type === 'refine') {
      let refineResult;
      try {
        refineResult = await refineTask(request.taskId);
      } catch (error) {
        refineResult = { ok: false, error: String(error?.message || error), taskId: request.taskId };
      }
      if (refineResult.ok) {
        ack = refineResult.summary.join('\n');
      } else {
        ack = [
          `[refine][task:${request.taskId}] failed`,
          `error: ${refineResult.error || 'unknown'}`,
          refineResult.rawOutput ? `output: ${String(refineResult.rawOutput).slice(0, 200)}` : null,
        ].filter(Boolean).join('\n');
      }
      const delivery = await sendDiscordAck(ack);
      processedIds.add(request.messageId);
      handledEntry = {
        message_id: request.messageId,
        task_id: request.taskId,
        type: 'refine',
        accepted: Boolean(refineResult?.ok),
        delivery_ok: delivery.ok,
        delivery_error: delivery.ok ? null : (delivery.stderr || delivery.stdout || 'message send failed'),
        handled_at: new Date().toISOString(),
      };
    } else {
      const { payload } = await dispatchTask(request.taskId);
      ack = buildAckMessage(request.taskId, payload);
      const delivery = await sendDiscordAck(ack);
      processedIds.add(request.messageId);
      handledEntry = {
        message_id: request.messageId,
        task_id: request.taskId,
        type: 'dispatch',
        accepted: Boolean(payload?.accepted),
        status: payload?.after?.status || null,
        claimed_by: payload?.after?.claimed_by || null,
        delivery_ok: delivery.ok,
        delivery_error: delivery.ok ? null : (delivery.stderr || delivery.stdout || 'message send failed'),
        handled_at: new Date().toISOString(),
      };
    }

    handled.push(handledEntry);
  }

  const nextState = {
    processed_message_ids: Array.from(processedIds).slice(-MAX_PROCESSED_IDS),
    processed: handled.slice(-MAX_PROCESSED_IDS),
    updated_at: new Date().toISOString(),
  };
  await writeJson(STATE_FILE, nextState);
}

main().catch(async (error) => {
  const state = await readJson(STATE_FILE, {
    processed_message_ids: [],
    processed: [],
  });
  const nextState = {
    ...state,
    updated_at: new Date().toISOString(),
    last_error: error instanceof Error ? error.message : String(error),
  };
  await writeJson(STATE_FILE, nextState);
  process.exit(1);
});
