import { spawn } from 'child_process';
import path from 'path';

import { writeJson, readJson, TASKS_DIR, ensureDir, truncate } from './loader.mjs';
import { ensureSpecialistRepoView, collectTaskGitEvidence, maybePushAndCreatePR } from './github.mjs';
import { validateStageCompletion, advanceStageAfterCompletion, statusForDispatch, pickExecutor, summarizeTask } from './validation.mjs';
import { notifyAndRecord, appendLog, appendAlert, formatLifecycleMessage } from './notify.mjs';
import { registerDeadSessionCallbacks } from './claims.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_TIMEOUT_SECONDS = Number(process.env.ROOK_DISPATCH_TIMEOUT_SECONDS || '60');
const DEFAULT_STALE_CLAIM_MINUTES = Number(process.env.ROOK_STALE_CLAIM_MINUTES || '20');
const DEFAULT_MAX_ATTEMPTS = Number(process.env.ROOK_DISPATCH_MAX_ATTEMPTS || '3');
const DEFAULT_MAX_TOTAL_ATTEMPTS = Number(process.env.ROOK_DISPATCH_MAX_TOTAL_ATTEMPTS || '9');
const DEFAULT_RETRY_DELAY_MS = Number(process.env.ROOK_DISPATCH_RETRY_DELAY_MS || '5000');
const HOOK_POLL_INTERVAL_MS = Number(process.env.ROOK_HOOK_POLL_INTERVAL_MS || '2000');
const HOOK_MODEL = process.env.ROOK_HOOK_MODEL || 'minimax-portal/MiniMax-M2.7';
const HOOK_FALLBACK_MODEL = process.env.ROOK_HOOK_FALLBACK_MODEL || 'kimi-coding/k2p5';
const HOOK_THINKING = process.env.ROOK_HOOK_THINKING || 'low';
const MAX_LOG_BYTES = 4000;
const CHILD_GRACE_MS = 30_000;
const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const GATEWAY_BASE_URL = process.env.ROOK_GATEWAY_BASE_URL || 'http://127.0.0.1:18789';

// Re-exported for internal reuse
export { MAX_LOG_BYTES };

// ---------------------------------------------------------------------------
// Register dead-session callbacks so claims.mjs can notify/log
// ---------------------------------------------------------------------------
registerDeadSessionCallbacks({
  alert: appendAlert,
  log: appendLog,
  notify: notifyAndRecord,
});

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// JSON helpers (also used by loader)
// ---------------------------------------------------------------------------

export function deepEqualJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

// ---------------------------------------------------------------------------
// Task ref / block helpers (used in main dispatch loop)
// ---------------------------------------------------------------------------

export function taskRef(task) {
  const projectId = String(task.project_id || '').trim();
  return projectId ? `${projectId}/${task.task_id}` : String(task.task_id || '');
}

export function unresolvedDependencies(task, taskMap) {
  return (task.dependencies || []).filter((dependencyId) => {
    const dependency = taskMap.get(dependencyId);
    return !dependency || dependency.task.status !== 'done';
  });
}

export function runtimeBlockStateChanged(entry, blockedBy, failureReason) {
  const priorRuntimeState = entry.runtimeState && typeof entry.runtimeState === 'object' ? entry.runtimeState : null;
  const previousBlockedBy = Array.isArray(priorRuntimeState?.blocked_by) ? priorRuntimeState.blocked_by : [];
  const previousFailureReason = String(priorRuntimeState?.failure_reason || '');
  return (
    !deepEqualJson(previousBlockedBy, blockedBy)
    || previousFailureReason !== failureReason
    || priorRuntimeState?.status !== 'blocked'
  );
}

function shouldClearHandoffNotesForDispatch(task) {
  const status = String(task.status || '');
  if (status !== 'ready') {
    return false;
  }
  const notes = String(task.handoff_notes || '').trim().toLowerCase();
  if (!notes) {
    return false;
  }
  return notes.startsWith('[agent:') && (notes.includes('blocked') || notes.includes('validated') || notes.includes('completed'));
}

// ---------------------------------------------------------------------------
// Hook config loading
// ---------------------------------------------------------------------------

let hookConfigPromise = null;

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

// ---------------------------------------------------------------------------
// Provider env loading
// ---------------------------------------------------------------------------

async function loadProviderEnv() {
  const ENV_DIR = '/root/.openclaw/.env.d';
  const PROVIDER_ENV_FILES = [
    path.join(ENV_DIR, 'minimax-api-key.txt'),
    path.join(ENV_DIR, 'kimi-api-key.txt'),
  ];
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

import { promises as fs } from 'fs';

// ---------------------------------------------------------------------------
// curl-based hook posting (fallback)
// ---------------------------------------------------------------------------

export async function postHookWithCurl(url, token, payload) {
  return new Promise((resolve) => {
    const child = spawn('curl', [
      '-sS',
      '-X',
      'POST',
      url,
      '-H',
      `Authorization: Bearer ${token}`,
      '-H',
      'Content-Type: application/json',
      '--data',
      JSON.stringify(payload),
      '-w',
      '\n%{http_code}',
    ], {
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
      const trimmed = stdout.trimEnd();
      const newlineIndex = trimmed.lastIndexOf('\n');
      const bodyText = newlineIndex >= 0 ? trimmed.slice(0, newlineIndex) : '';
      const statusText = newlineIndex >= 0 ? trimmed.slice(newlineIndex + 1).trim() : '';
      const status = Number(statusText || '0');
      resolve({
        ok: code === 0 && status >= 200 && status < 300,
        code: code ?? 1,
        status,
        bodyText,
        stderr: stderr.trim(),
      });
    });
    child.on('error', (error) => {
      resolve({
        ok: false,
        code: 1,
        status: 0,
        bodyText: '',
        stderr: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Hook transcript reading
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hook polling
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Agent execution
// ---------------------------------------------------------------------------

async function runAgent(agentId, task, dispatchMode, model = HOOK_MODEL) {
  await ensureSpecialistRepoView(task, agentId);

  if (dispatchMode === 'hook') {
    return runAgentViaHook(agentId, task, model);
  }

  const providerEnv = await loadProviderEnv();
  const { randomUUID } = await import('crypto');
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

async function runAgentViaHook(agentId, task, model = HOOK_MODEL) {
  const hookConfig = await loadHookConfig();
  const { randomUUID } = await import('crypto');
  const sessionKey = `hook:dispatcher:task:${task.task_id}:${randomUUID().slice(0, 8)}`;
  const payload = {
    message: summarizeTask(task, agentId),
    name: 'Dispatcher',
    agentId,
    sessionKey,
    wakeMode: 'now',
    deliver: false,
    model,
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
      const fallbackReason = curlFallback.stderr || `curl fallback returned HTTP ${curlFallback.status || 0}`;
      return {
        code: 1,
        stdout: curlFallback.bodyText || '',
        stderr: `hook dispatch request failed: ${error instanceof Error ? error.message : String(error)}; curl fallback failed: ${fallbackReason}`,
        sessionId: null,
        mode: 'hook',
      };
    }

    bodyText = curlFallback.bodyText;
    response = {
      ok: true,
      status: curlFallback.status,
      text: async () => bodyText,
    };
  }

  if (!bodyText) {
    bodyText = await response.text();
  }
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
    model,
    thinking: HOOK_THINKING,
  };
  return result;
}

// ---------------------------------------------------------------------------
// Result evaluation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Retry / error classification
// ---------------------------------------------------------------------------

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

function isTimeoutWithNoMessages(result) {
  return result.code === 124 && String(result.stderr || '').includes('no messages yet');
}

// ---------------------------------------------------------------------------
// Dispatch state building
// ---------------------------------------------------------------------------

export function buildDispatchState(task, executor, result, attempt, dispatchMode, nowIso) {
  const previous = task.dispatch && typeof task.dispatch === 'object' ? task.dispatch : {};
  const mode = dispatchMode === 'hook' ? 'hook' : dispatchMode;
  const next = {
    ...previous,
    mode,
    executor,
    attempts: attempt,
    total_attempts: (Number(previous.total_attempts || 0) + 1),
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

// ---------------------------------------------------------------------------
// Single-task dispatch
// ---------------------------------------------------------------------------

export async function dispatchTask(entry, options, nowIso) {
  const { task, filePath } = entry;

  const executor = pickExecutor(task);
  if (!executor) {
    task.status = 'blocked';
    task.blocked_by = ['dispatcher:executor-mapping'];
    task.failure_reason = 'Coordinator-owned task requires explicit executor mapping before dispatch.';
    task.last_heartbeat = nowIso;
    task.timestamps.updated_at = nowIso;
    await writeJson(filePath, task);
    if (runtimeBlockStateChanged(entry, task.blocked_by, task.failure_reason)) {
      await notifyAndRecord(
        task,
        'no_executor',
        `[dispatcher] blocked ${taskRef(task)}: no executor mapping for coordinator-owned task`
      );
    }
    await appendLog({
      ts: nowIso,
      task_id: task.task_id,
      action: 'no_executor',
      assigned_agent: task.assigned_agent,
    });
    return;
  }

  if (options.dryRun) {
    await appendLog({
      ts: nowIso,
      task_id: task.task_id,
      action: 'dispatch_dry_run',
      executor,
      filePath,
    });
    return;
  }

  // Hard ceiling
  const previousTotalAttempts = Number(task.dispatch?.total_attempts || 0);
  if (previousTotalAttempts >= DEFAULT_MAX_TOTAL_ATTEMPTS) {
    task.status = 'blocked';
    task.blocked_by = ['dispatcher:max-total-attempts'];
    task.failure_reason = `Exceeded maximum total dispatch attempts (${DEFAULT_MAX_TOTAL_ATTEMPTS}). Manual intervention required.`;
    task.timestamps.updated_at = nowIso;
    await writeJson(filePath, task);
    if (runtimeBlockStateChanged(entry, task.blocked_by, task.failure_reason)) {
      await notifyAndRecord(
        task,
        'max_attempts_exceeded',
        `[dispatcher] blocked ${taskRef(task)}: exceeded max total dispatch attempts (${previousTotalAttempts}/${DEFAULT_MAX_TOTAL_ATTEMPTS})`
      );
    }
    await appendLog({
      ts: nowIso,
      task_id: task.task_id,
      action: 'max_attempts_exceeded',
      total_attempts: previousTotalAttempts,
      max: DEFAULT_MAX_TOTAL_ATTEMPTS,
    });
    return;
  }

  const clearStaleHandoffNotes = shouldClearHandoffNotesForDispatch(task);
  task.status = statusForDispatch(task, executor);
  task.assigned_agent = task.status === 'testing'
    ? 'test'
    : task.status === 'review'
      ? 'review'
      : executor;
  if (clearStaleHandoffNotes) {
    task.handoff_notes = '';
  }
  task.claimed_by = `dispatcher:${executor}`;
  task.blocked_by = [];
  task.blocked_reason = null;
  task.failure_reason = null;
  task.last_heartbeat = nowIso;
  task.source_channel = task.source_channel || options.sourceChannel;
  task.timestamps.updated_at = nowIso;
  task.timestamps.claimed_at = nowIso;
  task.dispatch = {
    mode: options.dispatchMode,
    executor,
    attempts: 0,
    total_attempts: previousTotalAttempts,
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
  await notifyAndRecord(
    task,
    'dispatch_started',
    formatLifecycleMessage(task, 'dispatch_started', { executor })
  );

  let result = { code: 1, stdout: '', stderr: '' };
  let evaluation = { ok: false, reason: 'dispatch not attempted' };
  let attempt = 0;
  let modelToUse = HOOK_MODEL;

  for (attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt += 1) {
    result = await runAgent(executor, task, options.dispatchMode, modelToUse);
    evaluation = evaluateResult(result);
    task.dispatch = buildDispatchState(task, executor, result, attempt, options.dispatchMode, new Date().toISOString());
    await writeJson(filePath, task);

    await appendLog({
      ts: new Date().toISOString(),
      task_id: task.task_id,
      action: 'dispatch_attempt',
      executor,
      attempt,
      model: modelToUse,
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
      if (isTimeoutWithNoMessages(result) && modelToUse === HOOK_MODEL && HOOK_FALLBACK_MODEL) {
        modelToUse = HOOK_FALLBACK_MODEL;
      }
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

// ---------------------------------------------------------------------------
// Exported for index.mjs orchestration
// ----------------------------------------------------------------------------
export {
  runAgent,
  runAgentViaHook,
  waitForHookResult,
  readHookTranscriptState,
  evaluateHookTranscriptState,
  findHookAbort,
  flattenAssistantText,
  evaluateResult,
  parseJsonOutput,
};