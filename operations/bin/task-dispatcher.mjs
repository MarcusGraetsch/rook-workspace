#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const OPERATIONS_DIR = process.env.ROOK_OPERATIONS_DIR || '/root/.openclaw/workspace/operations';
const TASKS_DIR = path.join(OPERATIONS_DIR, 'tasks');
const LOG_DIR = path.join(OPERATIONS_DIR, 'logs', 'dispatcher');
const HEALTH_DIR = path.join(OPERATIONS_DIR, 'health');
const ALERTS_FILE = path.join(HEALTH_DIR, 'dispatcher-alerts.json');
const ENV_DIR = '/root/.openclaw/.env.d';
const PROVIDER_ENV_FILES = [
  path.join(ENV_DIR, 'minimax-api-key.txt'),
  path.join(ENV_DIR, 'kimi-api-key.txt'),
];
const DEFAULT_TIMEOUT_SECONDS = Number(process.env.ROOK_DISPATCH_TIMEOUT_SECONDS || '60');
const DEFAULT_STALE_CLAIM_MINUTES = Number(process.env.ROOK_STALE_CLAIM_MINUTES || '20');
const DEFAULT_MAX_ATTEMPTS = Number(process.env.ROOK_DISPATCH_MAX_ATTEMPTS || '3');
const DEFAULT_RETRY_DELAY_MS = Number(process.env.ROOK_DISPATCH_RETRY_DELAY_MS || '5000');
const NOTIFY_TIMEOUT_SECONDS = Number(process.env.ROOK_NOTIFY_TIMEOUT_SECONDS || '15');
const NOTIFY_MAX_ATTEMPTS = Number(process.env.ROOK_NOTIFY_MAX_ATTEMPTS || '3');
const NOTIFY_RETRY_DELAY_MS = Number(process.env.ROOK_NOTIFY_RETRY_DELAY_MS || '3000');
const NOTIFY_CHANNEL = process.env.ROOK_NOTIFY_CHANNEL || 'discord';
const NOTIFY_TARGET = process.env.ROOK_NOTIFY_TARGET || 'channel:1487786269542056071';
const NOTIFY_ENABLED = process.env.ROOK_NOTIFY_ENABLED !== '0';
const STAGE_FALLBACK_ENABLED = process.env.ROOK_STAGE_FALLBACK_ENABLED !== '0';
const GATEWAY_BASE_URL = process.env.ROOK_GATEWAY_BASE_URL || 'http://127.0.0.1:18789';
const HOOK_POLL_INTERVAL_MS = Number(process.env.ROOK_HOOK_POLL_INTERVAL_MS || '2000');
const HOOK_MODEL = process.env.ROOK_HOOK_MODEL || 'minimax-portal/MiniMax-M2.5';
const HOOK_THINKING = process.env.ROOK_HOOK_THINKING || 'low';
const MAX_LOG_BYTES = 4000;
const CHILD_GRACE_MS = 30_000;
const READY_STATUSES = new Set(['ready']);
const ACTIVE_STATUSES = new Set(['in_progress', 'testing', 'review']);
const TERMINAL_STATUS_ALIASES = new Map([['completed', 'done']]);
const TERMINAL_STATUSES = new Set(['done']);
const BOOTSTRAP_SPECIALISTS = new Set(['test', 'review']);
let hookConfigPromise = null;

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

function truncate(value, limit = MAX_LOG_BYTES) {
  return String(value || '').trim().slice(0, limit);
}

function deepEqualJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function loadProviderEnv() {
  const loaded = {};
  for (const filePath of PROVIDER_ENV_FILES) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index <= 0) continue;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        if (key && value) {
          loaded[key] = value;
        }
      }
    } catch {
      // Missing env files should not crash dispatch.
    }
  }
  return loaded;
}

async function loadHookConfig() {
  if (!hookConfigPromise) {
    hookConfigPromise = (async () => {
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
    })();
  }

  return hookConfigPromise;
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
  const labels = new Set(task.labels || []);
  const title = String(task.title || '').toLowerCase();
  const description = String(task.description || '').toLowerCase();

  if (
    task.status === 'ready'
    && BOOTSTRAP_SPECIALISTS.has(task.assigned_agent)
    && labels.has('agent')
    && (
      title.includes('einrichten')
      || title.includes('setup')
      || title.includes('set up')
      || description.includes('automatisch starten')
      || description.includes('automatically start')
    )
  ) {
    return 'engineer';
  }

  if (
    STAGE_FALLBACK_ENABLED
    && task.status === 'testing'
    && task.assigned_agent === 'test'
  ) {
    return 'engineer';
  }

  if (
    STAGE_FALLBACK_ENABLED
    && task.status === 'review'
    && task.assigned_agent === 'review'
  ) {
    return 'engineer';
  }

  if (task.assigned_agent !== 'rook') {
    return task.assigned_agent;
  }

  if (labels.has('review') || title.includes('review')) {
    return 'engineer';
  }

  if (labels.has('testing') || title.includes('test')) {
    return 'engineer';
  }

  return null;
}

function statusForDispatch(task, executor) {
  if (task.status === 'testing' && task.assigned_agent === 'test') {
    return 'testing';
  }

  if (task.status === 'review' && task.assigned_agent === 'review') {
    return 'review';
  }

  return statusForExecutor(executor);
}

function advanceStageAfterCompletion(task, executor, launchedStatus, nowIso) {
  const currentStatus = String(launchedStatus || task.status || '');

  if (currentStatus === 'in_progress' && executor === 'engineer') {
    task.status = 'testing';
    task.assigned_agent = 'test';
    task.workflow_stage = 'testing';
    task.blocked_by = [];
    task.failure_reason = null;
    task.timestamps.updated_at = nowIso;
    return { advanced: true, nextStage: 'testing', nextOwner: 'test' };
  }

  if (currentStatus === 'testing' && (executor === 'test' || executor === 'engineer')) {
    task.status = 'review';
    task.assigned_agent = 'review';
    task.workflow_stage = 'review';
    task.blocked_by = [];
    task.failure_reason = null;
    task.timestamps.updated_at = nowIso;
    return { advanced: true, nextStage: 'review', nextOwner: 'review' };
  }

  if (currentStatus === 'review' && (executor === 'review' || executor === 'engineer')) {
    task.status = 'done';
    task.workflow_stage = 'done';
    task.blocked_by = [];
    task.failure_reason = null;
    task.timestamps.updated_at = nowIso;
    task.timestamps.completed_at = task.timestamps.completed_at || nowIso;
    return { advanced: true, nextStage: 'done', nextOwner: task.assigned_agent || executor };
  }

  return { advanced: false, nextStage: currentStatus || null, nextOwner: task.assigned_agent || null };
}

function isDispatchable(task) {
  if (task.status === 'ready') {
    return true;
  }

  if (task.status === 'testing' && task.assigned_agent === 'test') {
    return true;
  }

  if (task.status === 'review' && task.assigned_agent === 'review') {
    return true;
  }

  return false;
}

function normalizeTaskStatus(status) {
  return TERMINAL_STATUS_ALIASES.get(status) || status;
}

async function normalizeTerminalTasks(loadedTasks, nowIso) {
  for (const entry of loadedTasks) {
    const { task, filePath } = entry;
    const normalizedStatus = normalizeTaskStatus(task.status);
    const terminal = TERMINAL_STATUSES.has(normalizedStatus);
    let changed = false;

    if (normalizedStatus !== task.status) {
      task.status = normalizedStatus;
      changed = true;
    }

    if (!terminal) {
      if (changed) {
        task.timestamps.updated_at = nowIso;
        await writeJson(filePath, task);
      }
      continue;
    }

    if (task.claimed_by) {
      task.claimed_by = null;
      changed = true;
    }

    if (task.timestamps?.claimed_at) {
      task.timestamps.claimed_at = null;
      changed = true;
    }

    if (!task.timestamps?.completed_at) {
      task.timestamps.completed_at = nowIso;
      changed = true;
    }

    if (task.dispatch && typeof task.dispatch === 'object') {
      const nextDispatch = {
        ...task.dispatch,
        last_checked_at: nowIso,
      };

      if (nextDispatch.last_result === 'running' || nextDispatch.last_result === 'launching') {
        nextDispatch.last_result = 'completed';
        nextDispatch.last_error = null;
      }

      if (!deepEqualJson(task.dispatch, nextDispatch)) {
        task.dispatch = nextDispatch;
        changed = true;
      }
    }

    if (changed) {
      task.timestamps.updated_at = nowIso;
      await writeJson(filePath, task);
      await appendLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'terminal_state_normalized',
        status: task.status,
      });
    }
  }
}

function unresolvedDependencies(task, taskMap) {
  return (task.dependencies || []).filter((dependencyId) => {
    const dependency = taskMap.get(dependencyId);
    return !dependency || dependency.task.status !== 'done';
  });
}

function repoTailFromTask(task) {
  return String(task.related_repo || '').split('/').at(-1) || task.project_id;
}

function repoViewPath(task, executor) {
  return path.join(OPENCLAW_DIR, `workspace-${executor}`, 'workspace', 'repos', repoTailFromTask(task));
}

async function runGit(repoPath, args) {
  return new Promise((resolve) => {
    const child = spawn('git', ['-C', repoPath, ...args], {
      cwd: OPENCLAW_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

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
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

async function collectTaskGitEvidence(task, executor) {
  const repoPath = repoViewPath(task, executor);
  const evidence = {
    repoPath,
    exists: false,
    currentBranch: null,
    upstreamBranch: null,
    aheadCount: null,
    behindCount: null,
    taskCommits: [],
    error: null,
  };

  try {
    await fs.access(repoPath);
  } catch {
    evidence.error = `Repo view not found: ${repoPath}`;
    return evidence;
  }

  evidence.exists = true;

  const branchResult = await runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult.code !== 0) {
    evidence.error = branchResult.stderr || 'Failed to determine current branch.';
    return evidence;
  }
  evidence.currentBranch = branchResult.stdout || null;

  const upstreamResult = await runGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  if (upstreamResult.code === 0 && upstreamResult.stdout) {
    evidence.upstreamBranch = upstreamResult.stdout;
    const aheadBehindResult = await runGit(repoPath, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']);
    if (aheadBehindResult.code === 0 && aheadBehindResult.stdout) {
      const [behindRaw, aheadRaw] = aheadBehindResult.stdout.split(/\s+/);
      evidence.behindCount = Number(behindRaw || '0');
      evidence.aheadCount = Number(aheadRaw || '0');
    }
  }

  const taskCommitResult = await runGit(repoPath, [
    'log',
    '--format=%H%x09%s',
    '--grep',
    `\\[task:${task.task_id}\\]`,
    '-n',
    '10',
    task.branch,
  ]);
  if (taskCommitResult.code === 0 && taskCommitResult.stdout) {
    evidence.taskCommits = taskCommitResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sha, ...rest] = line.split('\t');
        return {
          sha,
          message: rest.join('\t').trim(),
        };
      });
  }

  return evidence;
}

async function validateStageCompletion(task, executor, launchedStatus) {
  const stage = String(launchedStatus || task.status || '');
  const isCodeTask = Boolean(task.related_repo && task.branch);

  if (!isCodeTask) {
    return { ok: true, reason: null, blockedBy: [] };
  }

  if (stage === 'in_progress') {
    const handoff = String(task.handoff_notes || '').trim();
    if (!handoff) {
      return {
        ok: false,
        reason: `Engineer work completed but ${task.task_id} is missing handoff_notes.`,
        blockedBy: ['engineer:missing-handoff'],
      };
    }
  }

  if (stage === 'testing') {
    const commands = Array.isArray(task.test_evidence?.commands) ? task.test_evidence.commands.filter(Boolean) : [];
    const status = task.test_evidence?.status || null;
    const summary = String(task.test_evidence?.summary || '').trim();
    if (commands.length === 0) {
      return {
        ok: false,
        reason: `Testing completed but ${task.task_id} is missing test_evidence.commands.`,
        blockedBy: ['testing:missing-commands'],
      };
    }
    if (status !== 'passed') {
      return {
        ok: false,
        reason: `Testing completed but ${task.task_id} does not have test_evidence.status=passed.`,
        blockedBy: ['testing:not-passed'],
      };
    }
    if (!summary) {
      return {
        ok: false,
        reason: `Testing completed but ${task.task_id} is missing test_evidence.summary.`,
        blockedBy: ['testing:missing-summary'],
      };
    }
  }

  if (stage === 'review') {
    const verdict = task.review_evidence?.verdict || null;
    const summary = String(task.review_evidence?.summary || '').trim();
    if (verdict !== 'approved') {
      return {
        ok: false,
        reason: `Review completed but ${task.task_id} does not have review_evidence.verdict=approved.`,
        blockedBy: ['review:not-approved'],
      };
    }
    if (!summary) {
      return {
        ok: false,
        reason: `Review completed but ${task.task_id} is missing review_evidence.summary.`,
        blockedBy: ['review:missing-summary'],
      };
    }
    if (task.github_pull_request?.state === 'merged') {
      return { ok: true, reason: null, blockedBy: [] };
    }

    return {
      ok: false,
      reason: `Review completed but ${task.task_id} is not merged. A merged pull request is required before status can move to done.`,
      blockedBy: ['github:pr-not-merged'],
    };
  }

  const evidence = await collectTaskGitEvidence(task, executor);
  if (!evidence.exists) {
    return {
      ok: false,
      reason: evidence.error || `Repo view missing for ${task.task_id}.`,
      blockedBy: ['git:repo-view-missing'],
    };
  }

  if (evidence.currentBranch !== task.branch) {
    return {
      ok: false,
      reason: `Repo view is on branch ${evidence.currentBranch || 'unknown'}, expected ${task.branch}.`,
      blockedBy: ['git:branch-mismatch'],
    };
  }

  if (evidence.taskCommits.length === 0) {
    return {
      ok: false,
      reason: `Branch ${task.branch} has no commits tagged for ${task.task_id}.`,
      blockedBy: ['git:no-task-commits'],
    };
  }

  if (!evidence.upstreamBranch) {
    return {
      ok: false,
      reason: `Branch ${task.branch} has no upstream tracking branch. Push is required before stage advancement.`,
      blockedBy: ['git:no-upstream'],
    };
  }

  if ((evidence.aheadCount || 0) > 0) {
    return {
      ok: false,
      reason: `Branch ${task.branch} is ahead of ${evidence.upstreamBranch} by ${evidence.aheadCount} commit(s). Push is required before stage advancement.`,
      blockedBy: ['git:unpushed-commits'],
    };
  }

  return { ok: true, reason: null, blockedBy: [], evidence };
}

function summarizeTask(task, executor) {
  const canonicalTaskFile = path.join(TASKS_DIR, task.project_id, `${task.task_id}.json`);
  const localRepoView = repoViewPath(task, executor);
  const stageOwner = task.assigned_agent || executor;
  const checklistLines = Array.isArray(task.checklist)
    ? task.checklist
        .slice()
        .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
        .map((item, index) => `${item.completed ? '[x]' : '[ ]'} ${index + 1}. ${item.title}`)
    : [];
  const fallbackNote = executor !== stageOwner
    ? `Execution mode: fallback executor ${executor} is handling ${task.status} on behalf of ${stageOwner} because the dedicated specialist path is currently unstable.`
    : null;
  return [
    `Task ${task.task_id} for ${executor}.`,
    `Canonical file: ${canonicalTaskFile}`,
    `Repo view: ${localRepoView}`,
    `Stage: ${task.status}`,
    `Stage owner: ${stageOwner}`,
    `Branch: ${task.branch}`,
    `Title: ${task.title}`,
    fallbackNote,
    task.handoff_notes ? `Notes: ${task.handoff_notes}` : null,
    checklistLines.length > 0 ? `Checklist:\n${checklistLines.join('\n')}` : null,
    task.test_evidence ? `Test evidence: ${JSON.stringify(task.test_evidence)}` : null,
    task.review_evidence ? `Review evidence: ${JSON.stringify(task.review_evidence)}` : null,
    task.description ? `Goal: ${task.description}` : null,
    `Required: work only on this task, use commit prefix [agent:${executor}][task:${task.task_id}], record artifacts in the canonical file, and if blocked update failure_reason/blocked_by in the canonical file.`,
    checklistLines.length > 0
      ? 'Treat the checklist as part of the task contract. Complete the relevant items or update them honestly if scope changes.'
      : null,
    String(task.status || '') === 'in_progress'
      ? 'Before completing engineer work: update handoff_notes with what changed and the exact validation commands/results you ran.'
      : null,
    String(task.status || '') === 'testing'
      ? 'Before completing testing: fill test_evidence.status, test_evidence.commands, and test_evidence.summary in the canonical task. Do not leave testing without explicit commands and a pass/fail result.'
      : null,
    String(task.status || '') === 'review'
      ? 'Before completing review: fill review_evidence.verdict and review_evidence.summary in the canonical task. Code tasks only reach done after approved review and merged PR evidence.'
      : null,
    executor !== stageOwner
      ? `Do not change the stage owner. Keep the canonical task in ${task.status} until the testing/review work is complete, then advance it normally.`
      : null,
  ].filter(Boolean).join('\n');
}

async function runAgent(agentId, task, dispatchMode) {
  if (dispatchMode === 'hook') {
    return runAgentViaHook(agentId, task);
  }

  const providerEnv = await loadProviderEnv();
  const sessionId = randomUUID();
  const childEnv = {
    ...process.env,
    ...providerEnv,
    ROOK_AGENT_ID: agentId,
    ROOK_AGENT_SESSION_ID: sessionId,
    ROOK_AGENT_MESSAGE: summarizeTask(task, agentId),
    ROOK_AGENT_TIMEOUT: String(DEFAULT_TIMEOUT_SECONDS),
    ROOK_AGENT_LOCAL_FLAG: dispatchMode === 'local' ? '--local' : '',
  };
  const command = [
    'exec openclaw agent',
    '$ROOK_AGENT_LOCAL_FLAG',
    '--agent "$ROOK_AGENT_ID"',
    '--session-id "$ROOK_AGENT_SESSION_ID"',
    '--message "$ROOK_AGENT_MESSAGE"',
    '--timeout "$ROOK_AGENT_TIMEOUT"',
    '--json',
  ].join(' ');

  return new Promise((resolve) => {
    let settled = false;
    const child = spawn('bash', ['-lc', command], {
      cwd: '/root/.openclaw',
      env: childEnv,
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
      settle({ code: 1, stdout, stderr, sessionId });
    });
    child.on('close', (code) => {
      settle({ code: code ?? 1, stdout, stderr, sessionId });
    });
  });
}

function flattenAssistantText(message) {
  const content = Array.isArray(message?.content) ? message.content : [];
  return content
    .filter((entry) => entry?.type === 'text')
    .map((entry) => entry.text)
    .join('\n')
    .trim();
}

async function readHookTranscriptState(agentId, sessionKey) {
  const sessionsDir = path.join(OPENCLAW_DIR, 'agents', agentId, 'sessions');
  const indexPath = path.join(sessionsDir, 'sessions.json');
  let index = null;
  try {
    index = await readJson(indexPath);
  } catch {
    return null;
  }

  const storeKey = `agent:${agentId}:${sessionKey}`;
  const entry = index?.[storeKey];
  const sessionId = entry?.sessionId;
  if (!sessionId) {
    return null;
  }

  const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
  let raw = '';
  try {
    raw = await fs.readFile(transcriptPath, 'utf8');
  } catch {
    return { sessionId, transcriptPath, events: [], lastMessage: null };
  }

  const events = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Ignore partially written trailing lines while polling.
    }
  }

  const lastMessage = [...events].reverse().find((event) => event?.type === 'message') || null;
  const lastAssistantMessage = [...events].reverse().find(
    (event) => event?.type === 'message' && event?.message?.role === 'assistant'
  ) || null;
  return { sessionId, transcriptPath, events, lastMessage, lastAssistantMessage };
}

function latestEventTimestamp(state) {
  if (!Array.isArray(state?.events) || state.events.length === 0) {
    return null;
  }

  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const timestamp = state.events[index]?.timestamp;
    if (typeof timestamp === 'string' && timestamp) {
      return timestamp;
    }
  }

  return null;
}

function findHookAbort(state) {
  if (!Array.isArray(state?.events)) {
    return null;
  }

  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const event = state.events[index];

    if (
      event?.type === 'custom'
      && event?.customType === 'openclaw:prompt-error'
    ) {
      return {
        reason: truncate(event?.data?.error || 'worker prompt aborted'),
        timestamp: event?.timestamp || null,
        source: 'custom:openclaw:prompt-error',
      };
    }

    if (
      event?.type === 'message'
      && event?.message?.role === 'assistant'
      && event?.message?.stopReason === 'aborted'
    ) {
      return {
        reason: truncate(event?.message?.errorMessage || 'worker assistant message aborted'),
        timestamp: event?.timestamp || null,
        source: 'assistant:aborted',
      };
    }
  }

  return null;
}

function evaluateHookTranscriptState(state) {
  if (!state?.lastMessage) {
    return { done: false, ok: false, reason: 'hook session has no messages yet.' };
  }

  if (!state.lastAssistantMessage) {
    return { done: false, ok: false, reason: 'hook session has not produced any assistant activity yet.' };
  }

  const message = state.lastAssistantMessage.message;
  const role = message?.role || 'unknown';
  const stopReason = message?.stopReason || null;
  const assistantText = flattenAssistantText(message);

  if (role === 'assistant' && (stopReason === 'stop' || stopReason === 'toolUse')) {
    return {
      done: true,
      ok: true,
      reason: null,
      assistantText,
      stopReason,
    };
  }

  if (role === 'assistant' && stopReason) {
    return {
      done: true,
      ok: false,
      reason: `hook session ended with non-runnable stopReason=${stopReason}.`,
      assistantText,
      stopReason,
    };
  }

  return {
    done: false,
    ok: false,
    reason: `hook session assistant activity is incomplete (lastRole=${role}, stopReason=${stopReason || 'unknown'}).`,
    assistantText,
    stopReason,
  };
}

async function waitForHookResult(agentId, sessionKey) {
  const startedAt = Date.now();
  const timeoutMs = DEFAULT_TIMEOUT_SECONDS * 1000;
  let lastObserved = null;

  while (Date.now() - startedAt <= timeoutMs) {
    const state = await readHookTranscriptState(agentId, sessionKey);
    if (state) {
      lastObserved = state;
      const evaluation = evaluateHookTranscriptState(state);
      if (evaluation.done) {
        return {
          code: evaluation.ok ? 0 : 1,
          stdout: JSON.stringify({
            mode: 'hook',
            sessionId: state.sessionId,
            sessionKey,
            stopReason: evaluation.stopReason,
            assistantText: evaluation.assistantText,
          }),
          stderr: evaluation.ok ? '' : evaluation.reason,
          sessionId: state.sessionId,
          mode: 'hook',
          meta: {
            ok: evaluation.ok,
            stopReason: evaluation.stopReason,
            assistantText: evaluation.assistantText,
            reason: evaluation.reason,
          },
        };
      }
    }

    await sleep(HOOK_POLL_INTERVAL_MS);
  }

  const evaluation = evaluateHookTranscriptState(lastObserved);
  return {
    code: 124,
    stdout: JSON.stringify({
      mode: 'hook',
      sessionId: lastObserved?.sessionId || null,
      sessionKey,
      stopReason: evaluation.stopReason || null,
      assistantText: evaluation.assistantText || '',
    }),
    stderr: `hook session timed out after ${timeoutMs}ms. ${evaluation.reason}`,
    sessionId: lastObserved?.sessionId || null,
    mode: 'hook',
    meta: {
      ok: false,
      stopReason: evaluation.stopReason || null,
      assistantText: evaluation.assistantText || '',
      reason: `hook session timed out after ${timeoutMs}ms. ${evaluation.reason}`,
    },
  };
}

async function runAgentViaHook(agentId, task) {
  const hookConfig = await loadHookConfig();
  const sessionKey = `hook:dispatcher:task:${task.task_id}:${randomUUID().slice(0, 8)}`;
  const payload = {
    message: summarizeTask(task, agentId),
    name: 'Dispatcher',
    agentId,
    sessionKey,
    wakeMode: 'now',
    deliver: false,
    model: HOOK_MODEL,
    thinking: HOOK_THINKING,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  };

  let response;
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
    return {
      code: 1,
      stdout: '',
      stderr: `hook dispatch request failed: ${error instanceof Error ? error.message : String(error)}`,
      sessionId: null,
      mode: 'hook',
    };
  }

  const bodyText = await response.text();
  if (!response.ok) {
    return {
      code: response.status,
      stdout: bodyText,
      stderr: `hook dispatch request returned HTTP ${response.status}.`,
      sessionId: null,
      mode: 'hook',
    };
  }

  const result = await waitForHookResult(agentId, sessionKey);
  result.stdout = result.stdout
    ? `${bodyText}\n${result.stdout}`
    : bodyText;
  result.meta = {
    ...(result.meta || {}),
    mode: 'hook',
    sessionKey,
    model: HOOK_MODEL,
    thinking: HOOK_THINKING,
  };
  return result;
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
  if (result.mode === 'hook') {
    if (result.code !== 0) {
      return {
        ok: false,
        reason: result.meta?.reason || result.stderr || result.stdout || `hook run exited with ${result.code}`,
      };
    }

    return { ok: true, reason: null };
  }

  if (result.code !== 0) {
    return { ok: false, reason: result.stderr || result.stdout || `openclaw agent exited with ${result.code}` };
  }

  const parsed = parseJsonOutput(result.stdout);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  const payloads = Array.isArray(parsed.data?.payloads) ? parsed.data.payloads : [];
  const stopReason = parsed.data?.meta?.stopReason || null;
  const aborted = parsed.data?.meta?.aborted === true;

  if (aborted) {
    return { ok: false, reason: `openclaw agent aborted before completion (stopReason=${stopReason || 'unknown'}).` };
  }

  if (stopReason !== 'stop') {
    return { ok: false, reason: `openclaw agent did not reach a final stop state (stopReason=${stopReason || 'unknown'}).` };
  }

  if (payloads.length === 0) {
    return { ok: false, reason: 'openclaw agent finished without any payloads.' };
  }

  return { ok: true, reason: null };
}

async function sendNotification(message) {
  if (!NOTIFY_ENABLED || !message.trim()) {
    return { ok: true, skipped: true };
  }

  return new Promise((resolve) => {
    let settled = false;
    const child = spawn('openclaw', [
      'message',
      'send',
      '--channel',
      NOTIFY_CHANNEL,
      '--target',
      NOTIFY_TARGET,
      '--message',
      message,
    ], {
      cwd: '/root/.openclaw',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeoutMs = NOTIFY_TIMEOUT_SECONDS * 1000;
    let hardKill = null;
    const settle = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      if (hardKill) clearTimeout(hardKill);
      resolve(payload);
    };
    const killer = setTimeout(() => {
      stderr += `\nnotification timeout after ${timeoutMs}ms. Sent SIGTERM to openclaw child.`;
      child.kill('SIGTERM');
      hardKill = setTimeout(() => {
        stderr += `\nnotification hard-killed child after additional ${CHILD_GRACE_MS}ms grace period.`;
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
      stderr += `\nNotification spawn error: ${error.message}`;
      settle({ code: 1, stdout, stderr });
    });
    child.on('close', (code) => {
      settle({ code: code ?? 1, stdout, stderr });
    });
  });
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

async function appendAlert(entry) {
  await ensureDir(HEALTH_DIR);
  let existing = { updated_at: null, alerts: [] };
  try {
    existing = JSON.parse(await fs.readFile(ALERTS_FILE, 'utf8'));
  } catch {
    // Start a new alert file if it does not exist or is malformed.
  }

  const alerts = Array.isArray(existing.alerts) ? existing.alerts : [];
  alerts.push(entry);
  while (alerts.length > 50) {
    alerts.shift();
  }

  existing.updated_at = new Date().toISOString();
  existing.alerts = alerts;
  await writeJson(ALERTS_FILE, existing);
}

function classifyBlockedBy(reason) {
  const text = String(reason || '').toLowerCase();
  if (!text) return ['runtime:unknown'];
  if (text.includes('dependencies')) return ['dispatcher:dependency-block'];
  if (text.includes('executor mapping')) return ['dispatcher:executor-mapping'];
  if (text.includes('timeout')) return ['runtime:timeout'];
  if (text.includes('connection error') || text.includes('fetch failed')) return ['runtime:provider-connection'];
  if (text.includes('aborted') || text.includes('final stop state')) return ['runtime:agent-aborted'];
  if (text.includes('no stdout') || text.includes('non-json stdout') || text.includes('no payloads')) {
    return ['runtime:agent-no-output'];
  }
  return ['runtime:dispatch-failure'];
}

function isRetryableAbortReason(reason) {
  const text = String(reason || '').toLowerCase();
  if (!text) return false;
  return (
    text.includes('request was aborted')
    || text.includes('worker prompt aborted')
    || text.includes('assistant message aborted')
  );
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function notifyAndRecord(task, event, message) {
  let lastNotification = { ok: true, skipped: true, attempts: 0, stdout: '', stderr: '', code: 0 };

  if (NOTIFY_ENABLED && message.trim()) {
    for (let attempt = 1; attempt <= NOTIFY_MAX_ATTEMPTS; attempt += 1) {
      const result = await sendNotification(message);
      lastNotification = {
        ...result,
        attempts: attempt,
        ok: result.code === 0 || result.skipped === true,
      };
      if (lastNotification.ok) {
        break;
      }
      if (attempt < NOTIFY_MAX_ATTEMPTS) {
        await sleep(NOTIFY_RETRY_DELAY_MS);
      }
    }
  }

  const alert = {
    ts: new Date().toISOString(),
    task_id: task.task_id,
    event,
    assigned_agent: task.assigned_agent,
    claimed_by: task.claimed_by,
    status: task.status,
    message: truncate(message),
    notify_ok: lastNotification.ok,
    notify_attempts: lastNotification.attempts,
    notify_code: lastNotification.code ?? 0,
    notify_stdout: truncate(lastNotification.stdout),
    notify_stderr: truncate(lastNotification.stderr),
  };

  await appendAlert(alert);
  await appendLog({
    ...alert,
    action: 'dispatch_notification',
  });

  return lastNotification;
}

function buildDispatchState(task, executor, result, attempt, dispatchMode, nowIso) {
  const previous = task.dispatch && typeof task.dispatch === 'object' ? task.dispatch : {};
  const mode = dispatchMode === 'hook' ? 'hook' : dispatchMode;
  const next = {
    ...previous,
    mode,
    executor,
    attempts: attempt,
    launched_at: previous.launched_at || nowIso,
    last_checked_at: nowIso,
    model: mode === 'hook' ? (result.meta?.model || previous.model || HOOK_MODEL) : (previous.model || null),
    thinking: mode === 'hook' ? (result.meta?.thinking || previous.thinking || HOOK_THINKING) : (previous.thinking || null),
    session_key: result.meta?.sessionKey || previous.session_key || null,
    session_id: result.sessionId || previous.session_id || null,
    dispatched_status: previous.dispatched_status || task.status || null,
    dispatched_owner: previous.dispatched_owner || task.assigned_agent || executor || null,
    last_result: result.code === 0 ? 'running' : 'failed',
    last_error: result.code === 0 ? null : truncate(result.meta?.reason || result.stderr || result.stdout || `dispatch failed with code ${result.code}`),
  };
  return next;
}

async function inspectActiveHookClaims(loadedTasks, nowIso) {
  for (const entry of loadedTasks) {
    const { task, filePath } = entry;
    const dispatch = task.dispatch && typeof task.dispatch === 'object' ? task.dispatch : null;

    if (!task.claimed_by || !ACTIVE_STATUSES.has(task.status)) {
      continue;
    }

    if (dispatch?.mode !== 'hook' || !dispatch?.session_key) {
      continue;
    }

    const executor = String(dispatch.executor || task.claimed_by.replace(/^dispatcher:/, '') || '');
    if (!executor) {
      continue;
    }

    const state = await readHookTranscriptState(executor, dispatch.session_key);
    if (!state) {
      continue;
    }

    let changed = false;
    const nextDispatch = { ...dispatch };

    if (state.sessionId && state.sessionId !== nextDispatch.session_id) {
      nextDispatch.session_id = state.sessionId;
      changed = true;
    }

    const seenAt = latestEventTimestamp(state);
    if (seenAt && seenAt !== task.last_heartbeat) {
      task.last_heartbeat = seenAt;
      changed = true;
    }

    nextDispatch.last_checked_at = nowIso;

    const abort = findHookAbort(state);
    if (abort) {
      const currentAttempt = Number(nextDispatch.attempts || 1);
      const canRetry = currentAttempt < DEFAULT_MAX_ATTEMPTS && isRetryableAbortReason(abort.reason);

      if (canRetry) {
        const retryAttempt = currentAttempt + 1;
        await appendLog({
          ts: nowIso,
          task_id: task.task_id,
          action: 'hook_worker_retrying',
          executor,
          previous_attempt: currentAttempt,
          next_attempt: retryAttempt,
          session_key: nextDispatch.session_key,
          session_id: nextDispatch.session_id,
          reason: truncate(abort.reason),
        });

        const retryResult = await runAgent(executor, task, nextDispatch.mode || 'hook');
        const retryEvaluation = evaluateResult(retryResult);
        task.last_heartbeat = nowIso;
        task.timestamps.updated_at = nowIso;
        task.dispatch = buildDispatchState(
          task,
          executor,
          retryResult,
          retryAttempt,
          nextDispatch.mode || 'hook',
          new Date().toISOString()
        );
        await writeJson(filePath, task);
        await appendLog({
          ts: new Date().toISOString(),
          task_id: task.task_id,
          action: 'dispatch_attempt',
          executor,
          attempt: retryAttempt,
          ok: retryEvaluation.ok,
          code: retryResult.code,
          stdout: retryResult.stdout.slice(-MAX_LOG_BYTES),
          stderr: retryResult.stderr.slice(-MAX_LOG_BYTES),
          reason: retryEvaluation.reason,
          retry_of_abort: true,
        });

        if (retryEvaluation.ok) {
          await notifyAndRecord(
            task,
            'worker_retry_started',
            `[dispatcher] retrying ${task.task_id}: relaunched ${executor} after transient hook abort`
          );
          continue;
        }
      }

      task.status = 'blocked';
      task.claimed_by = null;
      task.failure_reason = `Hook worker aborted (${abort.source}): ${abort.reason}`;
      task.blocked_by = ['runtime:agent-aborted'];
      task.last_heartbeat = abort.timestamp || seenAt || nowIso;
      task.timestamps.updated_at = nowIso;
      task.timestamps.claimed_at = null;
      task.dispatch = {
        ...nextDispatch,
        last_result: 'aborted',
        last_error: task.failure_reason,
        last_checked_at: nowIso,
      };
      await writeJson(filePath, task);
      await notifyAndRecord(
        task,
        'worker_aborted',
        `[dispatcher] blocked ${task.task_id}: ${task.failure_reason}`
      );
      await appendLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'hook_worker_aborted',
        executor,
        session_key: nextDispatch.session_key,
        session_id: nextDispatch.session_id,
        reason: task.failure_reason,
      });
      continue;
    }

    const evaluation = evaluateHookTranscriptState(state);
    if (evaluation.done && evaluation.ok && evaluation.stopReason === 'stop') {
      const completionCheck = await validateStageCompletion(
        task,
        executor,
        nextDispatch.dispatched_status,
      );
      if (!completionCheck.ok) {
        task.status = 'blocked';
        task.claimed_by = null;
        task.blocked_by = completionCheck.blockedBy;
        task.failure_reason = completionCheck.reason;
        task.timestamps.updated_at = nowIso;
        task.timestamps.claimed_at = null;
        task.last_heartbeat = latestEventTimestamp(state) || task.last_heartbeat || nowIso;
        task.dispatch = {
          ...nextDispatch,
          last_result: 'completed',
          last_error: completionCheck.reason,
          last_checked_at: nowIso,
        };
        await writeJson(filePath, task);
        await notifyAndRecord(
          task,
          'dispatch_blocked',
          `[dispatcher] blocked ${task.task_id}: ${completionCheck.reason}`
        );
        await appendLog({
          ts: nowIso,
          task_id: task.task_id,
          action: 'hook_worker_blocked_on_completion',
          executor,
          session_key: nextDispatch.session_key,
          session_id: nextDispatch.session_id,
          reason: completionCheck.reason,
          blocked_by: completionCheck.blockedBy,
        });
        continue;
      }

      const promotion = advanceStageAfterCompletion(
        task,
        executor,
        nextDispatch.dispatched_status,
        nowIso
      );
      task.claimed_by = null;
      task.timestamps.updated_at = nowIso;
      task.timestamps.claimed_at = null;
      task.last_heartbeat = latestEventTimestamp(state) || task.last_heartbeat || nowIso;
      task.dispatch = {
        ...nextDispatch,
        last_result: 'completed',
        last_error: null,
        last_checked_at: nowIso,
      };
      await writeJson(filePath, task);
      if (promotion.advanced) {
        await notifyAndRecord(
          task,
          'stage_advanced',
          `[dispatcher] advanced ${task.task_id} to ${promotion.nextStage} (stage owner: ${promotion.nextOwner})`
        );
      }
      await appendLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'hook_worker_completed',
        executor,
        session_key: nextDispatch.session_key,
        session_id: nextDispatch.session_id,
        status: task.status,
        assigned_agent: task.assigned_agent,
        next_stage: promotion.nextStage,
      });
      continue;
    }

    if (!deepEqualJson(task.dispatch, nextDispatch)) {
      task.dispatch = nextDispatch;
      changed = true;
    }

    if (changed) {
      task.timestamps.updated_at = nowIso;
      await writeJson(filePath, task);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const loadedTasks = await loadTasks();
  const taskMap = new Map(loadedTasks.map((entry) => [entry.task.task_id, entry]));

  await normalizeTerminalTasks(loadedTasks, nowIso);
  await inspectActiveHookClaims(loadedTasks, nowIso);

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
    .filter(({ task }) => isDispatchable(task))
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
      await notifyAndRecord(
        task,
        'dependency_block',
        `[dispatcher] blocked ${task.task_id}: waiting for dependencies ${blockers.join(', ')}`
      );
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
      task.blocked_by = ['dispatcher:executor-mapping'];
      task.failure_reason = 'Coordinator-owned task requires explicit executor mapping before dispatch.';
      task.last_heartbeat = nowIso;
      task.timestamps.updated_at = nowIso;
      await writeJson(filePath, task);
      await notifyAndRecord(
        task,
        'no_executor',
        `[dispatcher] blocked ${task.task_id}: no executor mapping for coordinator-owned task`
      );
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

    task.status = statusForDispatch(task, executor);
    task.assigned_agent = task.status === 'testing'
      ? 'test'
      : task.status === 'review'
        ? 'review'
        : executor;
    task.claimed_by = `dispatcher:${executor}`;
    task.blocked_by = [];
    task.failure_reason = null;
    task.last_heartbeat = nowIso;
    task.source_channel = task.source_channel || options.sourceChannel;
    task.timestamps.updated_at = nowIso;
    task.timestamps.claimed_at = nowIso;
    task.dispatch = {
      mode: options.dispatchMode,
      executor,
      attempts: 0,
      launched_at: nowIso,
      last_checked_at: nowIso,
      model: options.dispatchMode === 'hook' ? HOOK_MODEL : null,
      thinking: options.dispatchMode === 'hook' ? HOOK_THINKING : null,
      session_key: null,
      session_id: null,
      dispatched_status: task.status,
      dispatched_owner: task.assigned_agent,
      last_result: 'launching',
      last_error: null,
    };
    if (!task.timestamps.started_at) {
      task.timestamps.started_at = nowIso;
    }

    await writeJson(filePath, task);

    let result = { code: 1, stdout: '', stderr: '' };
    let evaluation = { ok: false, reason: 'dispatch not attempted' };
    let attempt = 0;

    for (attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt += 1) {
      result = await runAgent(executor, task, options.dispatchMode);
      evaluation = evaluateResult(result);
      task.dispatch = buildDispatchState(task, executor, result, attempt, options.dispatchMode, new Date().toISOString());
      await writeJson(filePath, task);

      await appendLog({
        ts: new Date().toISOString(),
        task_id: task.task_id,
        action: 'dispatch_attempt',
        executor,
        attempt,
        ok: evaluation.ok,
        code: result.code,
        stdout: result.stdout.slice(-MAX_LOG_BYTES),
        stderr: result.stderr.slice(-MAX_LOG_BYTES),
        reason: evaluation.reason,
      });

      if (evaluation.ok) {
        break;
      }

      if (attempt < DEFAULT_MAX_ATTEMPTS) {
        await sleep(DEFAULT_RETRY_DELAY_MS);
      }
    }

    const ok = evaluation.ok;

    if (!ok) {
      task.status = 'blocked';
      task.claimed_by = null;
      task.failure_reason = truncate(
        evaluation.reason || result.stderr || result.stdout || `openclaw agent exited with ${result.code}`
      );
      task.blocked_by = classifyBlockedBy(task.failure_reason);
      task.last_heartbeat = new Date().toISOString();
      task.timestamps.updated_at = task.last_heartbeat;
      task.timestamps.claimed_at = null;
      task.dispatch = {
        ...(task.dispatch || {}),
        last_result: 'failed',
        last_error: task.failure_reason,
        last_checked_at: task.last_heartbeat,
      };
      await writeJson(filePath, task);
      await notifyAndRecord(
        task,
        'dispatch_blocked',
        `[dispatcher] blocked ${task.task_id}: ${task.failure_reason}`
      );
    }

    await appendLog({
      ts: new Date().toISOString(),
      task_id: task.task_id,
      action: 'dispatch',
      executor,
      attempts: attempt,
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
