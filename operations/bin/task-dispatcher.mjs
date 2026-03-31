#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OPERATIONS_DIR = process.env.ROOK_OPERATIONS_DIR || '/root/.openclaw/workspace/operations';
const TASKS_DIR = path.join(OPERATIONS_DIR, 'tasks');
const LOG_DIR = path.join(OPERATIONS_DIR, 'logs', 'dispatcher');
const DEFAULT_TIMEOUT_SECONDS = Number(process.env.ROOK_DISPATCH_TIMEOUT_SECONDS || '60');
const DEFAULT_STALE_CLAIM_MINUTES = Number(process.env.ROOK_STALE_CLAIM_MINUTES || '20');
const MAX_LOG_BYTES = 4000;
const CHILD_GRACE_MS = 30_000;
const READY_STATUSES = new Set(['ready']);
const ACTIVE_STATUSES = new Set(['in_progress', 'testing', 'review']);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    taskId: null,
    limit: 10,
    sourceChannel: 'system:dispatcher',
    dispatchMode: process.env.ROOK_DISPATCH_MODE || 'gateway',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') options.dryRun = true;
    else if (value === '--task') options.taskId = argv[++index] || null;
    else if (value === '--limit') options.limit = Number(argv[++index] || '10');
    else if (value === '--source-channel') options.sourceChannel = argv[++index] || options.sourceChannel;
    else if (value === '--dispatch-mode') options.dispatchMode = argv[++index] || options.dispatchMode;
  }

  return options;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function loadTasks() {
  const tasks = [];
  let projectDirs = [];
  try {
    projectDirs = await fs.readdir(TASKS_DIR);
  } catch {
    return tasks;
  }

  for (const projectId of projectDirs) {
    const projectDir = path.join(TASKS_DIR, projectId);
    let files = [];
    try {
      files = await fs.readdir(projectDir);
    } catch {
      continue;
    }

    for (const fileName of files) {
      if (!fileName.endsWith('.json')) continue;
      const filePath = path.join(projectDir, fileName);
      try {
        const task = await readJson(filePath);
        tasks.push({ filePath, task });
      } catch {
        // Ignore malformed tasks but keep dispatcher running.
      }
    }
  }

  return tasks;
}

function statusForExecutor(agentId) {
  if (agentId === 'test') return 'testing';
  if (agentId === 'review') return 'review';
  return 'in_progress';
}

function pickExecutor(task) {
  if (task.assigned_agent !== 'rook') {
    return task.assigned_agent;
  }

  const labels = new Set(task.labels || []);
  const title = String(task.title || '').toLowerCase();

  if (labels.has('review') || title.includes('review')) {
    return 'engineer';
  }

  if (labels.has('testing') || title.includes('test')) {
    return 'engineer';
  }

  return null;
}

function unresolvedDependencies(task, taskMap) {
  return (task.dependencies || []).filter((dependencyId) => {
    const dependency = taskMap.get(dependencyId);
    return !dependency || dependency.task.status !== 'done';
  });
}

function summarizeTask(task, executor) {
  const canonicalTaskFile = path.join(TASKS_DIR, task.project_id, `${task.task_id}.json`);
  const repoTail = String(task.related_repo || '').split('/').at(-1) || task.project_id;
  const localRepoView = `/root/.openclaw/workspace-${executor}/workspace/repos/${repoTail}`;
  return [
    `Canonical task: ${task.task_id}`,
    `Canonical task file: ${canonicalTaskFile}`,
    'Primary workspace root: /root/.openclaw/workspace',
    `Preferred local repo view: ${localRepoView}`,
    `Title: ${task.title}`,
    `Project: ${task.project_id}`,
    `Repo: ${task.related_repo}`,
    `Priority: ${task.priority}`,
    `Branch: ${task.branch}`,
    `Status has already been moved to ${task.status} by the dispatcher.`,
    task.description ? `Description:\n${task.description}` : null,
    (task.dependencies || []).length > 0 ? `Dependencies: ${(task.dependencies || []).join(', ')}` : null,
    task.handoff_notes ? `Handoff notes:\n${task.handoff_notes}` : null,
    '',
    'Required behavior:',
    `- Work only on this bounded task for repo ${task.related_repo}.`,
    `- Use commit messages like [agent:${executor}][task:${task.task_id}] summary.`,
    '- If you create artifacts, record their paths in the canonical task file.',
    '- If blocked, update failure_reason and blocked_by in the canonical task file.',
    '- If work finishes, advance the task to testing, review, or done as appropriate.',
  ].filter(Boolean).join('\n');
}

function runAgent(agentId, task, dispatchMode) {
  const args = [
    'agent',
    '--agent',
    agentId,
    '--message',
    summarizeTask(task, agentId),
    '--timeout',
    String(DEFAULT_TIMEOUT_SECONDS),
    '--json',
  ];

  if (dispatchMode === 'local') {
    args.push('--local');
  }

  return new Promise((resolve) => {
    let settled = false;
    const child = spawn('openclaw', args, {
      cwd: '/root/.openclaw',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeoutMs = DEFAULT_TIMEOUT_SECONDS * 1000;
    let hardKill = null;
    const settle = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      if (hardKill) clearTimeout(hardKill);
      resolve(payload);
    };
    const killer = setTimeout(() => {
      stderr += `\nDispatcher timeout after ${timeoutMs}ms. Sent SIGTERM to openclaw child.`;
      child.kill('SIGTERM');
      hardKill = setTimeout(() => {
        stderr += `\nDispatcher hard-killed child after additional ${CHILD_GRACE_MS}ms grace period.`;
        child.kill('SIGKILL');
      }, CHILD_GRACE_MS);
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      stderr += `\nSpawn error: ${error.message}`;
      settle({ code: 1, stdout, stderr });
    });
    child.on('close', (code) => {
      settle({ code: code ?? 1, stdout, stderr });
    });
  });
}

function parseJsonOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: false, reason: 'openclaw agent returned no stdout.' };
  }

  const jsonStart = trimmed.indexOf('{');
  if (jsonStart < 0) {
    return { ok: false, reason: 'openclaw agent returned non-JSON stdout.' };
  }

  try {
    return { ok: true, data: JSON.parse(trimmed.slice(jsonStart)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `failed to parse openclaw JSON output: ${message}` };
  }
}

function evaluateResult(result) {
  if (result.code !== 0) {
    return { ok: false, reason: result.stderr || result.stdout || `openclaw agent exited with ${result.code}` };
  }

  const parsed = parseJsonOutput(result.stdout);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  const payloads = Array.isArray(parsed.data?.payloads) ? parsed.data.payloads : [];
  const stopReason = parsed.data?.meta?.stopReason || null;
  if (payloads.length === 0 && stopReason !== 'stop') {
    return { ok: false, reason: 'openclaw agent returned no payloads and no successful stop reason.' };
  }

  return { ok: true, reason: null };
}

function taskHeartbeatIso(task) {
  return task.last_heartbeat
    || task.timestamps?.claimed_at
    || task.timestamps?.updated_at
    || task.timestamps?.started_at
    || null;
}

function isClaimStale(task, nowMs) {
  if (!task.claimed_by || !ACTIVE_STATUSES.has(task.status)) {
    return false;
  }

  const heartbeatIso = taskHeartbeatIso(task);
  const heartbeatMs = heartbeatIso ? Date.parse(heartbeatIso) : Number.NaN;
  if (!Number.isFinite(heartbeatMs)) {
    return true;
  }

  return nowMs - heartbeatMs > DEFAULT_STALE_CLAIM_MINUTES * 60_000;
}

async function appendLog(entry) {
  await ensureDir(LOG_DIR);
  const filePath = path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const loadedTasks = await loadTasks();
  const taskMap = new Map(loadedTasks.map((entry) => [entry.task.task_id, entry]));

  for (const entry of loadedTasks) {
    const { task, filePath } = entry;
    if (!isClaimStale(task, nowMs)) {
      continue;
    }

    const previousClaim = task.claimed_by;
    const heartbeatIso = taskHeartbeatIso(task);
    task.status = 'blocked';
    task.claimed_by = null;
    task.failure_reason = `Stale claim released by dispatcher after ${DEFAULT_STALE_CLAIM_MINUTES}m without heartbeat. Previous claim: ${previousClaim || 'unknown'}; last heartbeat: ${heartbeatIso || 'missing'}.`;
    task.last_heartbeat = nowIso;
    task.timestamps.updated_at = nowIso;
    task.timestamps.claimed_at = null;
    await writeJson(filePath, task);
    await appendLog({
      ts: nowIso,
      task_id: task.task_id,
      action: 'stale_claim_released',
      previous_claim: previousClaim,
      last_heartbeat: heartbeatIso,
    });
  }

  const readyTasks = loadedTasks
    .filter(({ task }) => READY_STATUSES.has(task.status))
    .filter(({ task }) => !task.claimed_by)
    .filter(({ task }) => !options.taskId || task.task_id === options.taskId)
    .sort((left, right) => {
      const weights = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (weights[left.task.priority] ?? 99) - (weights[right.task.priority] ?? 99);
    })
    .slice(0, options.limit);

  for (const entry of readyTasks) {
    const { task, filePath } = entry;
    const blockers = unresolvedDependencies(task, taskMap);

    if (blockers.length > 0) {
      task.status = 'blocked';
      task.blocked_by = blockers;
      task.failure_reason = `Waiting for dependencies: ${blockers.join(', ')}`;
      task.last_heartbeat = nowIso;
      task.timestamps.updated_at = nowIso;
      await writeJson(filePath, task);
      await appendLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'dependency_block',
        blocked_by: blockers,
      });
      continue;
    }

    const executor = pickExecutor(task);

    if (!executor) {
      task.status = 'blocked';
      task.failure_reason = 'Coordinator-owned task requires explicit executor mapping before dispatch.';
      task.last_heartbeat = nowIso;
      task.timestamps.updated_at = nowIso;
      await writeJson(filePath, task);
      await appendLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'no_executor',
        assigned_agent: task.assigned_agent,
      });
      continue;
    }

    if (options.dryRun) {
      await appendLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'dispatch_dry_run',
        executor,
        filePath,
      });
      continue;
    }

    task.status = statusForExecutor(executor);
    task.claimed_by = `dispatcher:${executor}`;
    task.blocked_by = [];
    task.failure_reason = null;
    task.last_heartbeat = nowIso;
    task.source_channel = task.source_channel || options.sourceChannel;
    task.timestamps.updated_at = nowIso;
    task.timestamps.claimed_at = nowIso;
    if (!task.timestamps.started_at) {
      task.timestamps.started_at = nowIso;
    }

    await writeJson(filePath, task);

    const result = await runAgent(executor, task, options.dispatchMode);
    const evaluation = evaluateResult(result);
    const ok = evaluation.ok;

    if (!ok) {
      task.status = 'blocked';
      task.claimed_by = null;
      task.failure_reason = (evaluation.reason || result.stderr || result.stdout || `openclaw agent exited with ${result.code}`)
        .trim()
        .slice(0, MAX_LOG_BYTES);
      task.last_heartbeat = new Date().toISOString();
      task.timestamps.updated_at = task.last_heartbeat;
      task.timestamps.claimed_at = null;
      await writeJson(filePath, task);
    }

    await appendLog({
      ts: new Date().toISOString(),
      task_id: task.task_id,
      action: 'dispatch',
      executor,
      ok,
      code: result.code,
      stdout: result.stdout.slice(-MAX_LOG_BYTES),
      stderr: result.stderr.slice(-MAX_LOG_BYTES),
    });
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  await appendLog({
    ts: new Date().toISOString(),
    action: 'fatal',
    error: message,
  });
  process.exitCode = 1;
});
