import { promises as fs } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Constants (same as original)
// ---------------------------------------------------------------------------
const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const OPERATIONS_DIR = process.env.ROOK_OPERATIONS_DIR || '/root/.openclaw/workspace/operations';
const RUNTIME_ROOT = process.env.ROOK_RUNTIME_ROOT || path.join(OPENCLAW_DIR, 'runtime');
const RUNTIME_OPERATIONS_DIR =
  process.env.ROOK_RUNTIME_OPERATIONS_DIR || path.join(RUNTIME_ROOT, 'operations');
export const TASKS_DIR = path.join(OPERATIONS_DIR, 'tasks');
const LOG_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'logs', 'dispatcher');
const HEALTH_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'health');
export const ALERTS_FILE = path.join(HEALTH_DIR, 'dispatcher-alerts.json');
export const LOG_DIR_PATH = LOG_DIR;
const TASK_STATE_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'task-state');
const READY_STATUSES = new Set(['ready']);
const TERMINAL_STATUS_ALIASES = new Map([['completed', 'done']]);
const TERMINAL_STATUSES = new Set(['done']);
const MAX_LOG_BYTES = 4000;

// Re-exported from task-dispatcher constants so callers don't need extra imports
export { MAX_LOG_BYTES };

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------
export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error.code !== 'ENOENT') {
      console.error(`[dispatcher] Failed to parse JSON from ${filePath}: ${errorMessage}`);
    }
    throw new Error(`Failed to parse JSON from ${filePath}: ${errorMessage}`);
  }
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  let serialized;
  try {
    serialized = JSON.stringify(data, null, 2);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[dispatcher] JSON serialization failed for ${filePath}: ${errorMessage}`);
    throw new Error(`Failed to serialize data to JSON for ${filePath}: ${errorMessage}`);
  }
  await fs.writeFile(filePath, `${serialized}\n`, 'utf8');
}

function runtimeTaskStatePath(projectId, fileName) {
  return path.join(TASK_STATE_DIR, projectId, fileName);
}

export async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Status normalization
// ---------------------------------------------------------------------------
export function normalizeTaskStatus(status) {
  return TERMINAL_STATUS_ALIASES.get(status) || status;
}

// ---------------------------------------------------------------------------
// Task state helpers
// ---------------------------------------------------------------------------
function shouldPreferCanonicalControlState(baseTask, runtimeState) {
  if (!runtimeState || typeof runtimeState !== 'object') {
    return false;
  }

  const normalizedBaseStatus = normalizeTaskStatus(baseTask.status);
  const normalizedRuntimeStatus = normalizeTaskStatus(runtimeState.status);

  if (
    normalizedRuntimeStatus === 'blocked'
    && READY_STATUSES.has(normalizedBaseStatus)
    && !runtimeState.claimed_by
  ) {
    return true;
  }

  if (TERMINAL_STATUSES.has(normalizedBaseStatus)) {
    return true;
  }

  if (normalizedRuntimeStatus === 'blocked' || TERMINAL_STATUSES.has(normalizedRuntimeStatus)) {
    return false;
  }

  return (
    TERMINAL_STATUSES.has(normalizedBaseStatus)
    || (READY_STATUSES.has(normalizedBaseStatus) && normalizedRuntimeStatus !== normalizedBaseStatus)
  );
}

export function applyRuntimeTaskState(baseTask, runtimeState) {
  if (!runtimeState || typeof runtimeState !== 'object') {
    return baseTask;
  }

  if (shouldPreferCanonicalControlState(baseTask, runtimeState)) {
    return {
      ...baseTask,
      github_issue: runtimeState.github_issue || baseTask.github_issue,
      github_pull_request: runtimeState.github_pull_request || baseTask.github_pull_request,
    };
  }

  const merged = { ...baseTask, ...runtimeState };
  if (runtimeState.dispatch) merged.dispatch = runtimeState.dispatch;
  if (runtimeState.timestamps) {
    merged.timestamps = {
      ...(baseTask.timestamps || {}),
      ...runtimeState.timestamps,
    };
  }
  if (runtimeState.github_issue) merged.github_issue = runtimeState.github_issue;
  if (runtimeState.github_pull_request) merged.github_pull_request = runtimeState.github_pull_request;
  return merged;
}

export function buildRuntimeTaskState(task) {
  return {
    status: task.status,
    assigned_agent: task.assigned_agent,
    claimed_by: task.claimed_by ?? null,
    blocked_by: Array.isArray(task.blocked_by) ? task.blocked_by : [],
    workflow_stage: task.workflow_stage || null,
    blocked_reason: task.blocked_reason ?? null,
    handoff_notes: task.handoff_notes || '',
    last_heartbeat: task.last_heartbeat ?? null,
    failure_reason: task.failure_reason ?? null,
    source_channel: task.source_channel ?? null,
    dispatch: task.dispatch || null,
    github_issue: task.github_issue || null,
    github_pull_request: task.github_pull_request || null,
    timestamps: task.timestamps || null,
  };
}

// ---------------------------------------------------------------------------
// Task loading
// ---------------------------------------------------------------------------
export async function loadTasks() {
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
      const sourceFilePath = path.join(projectDir, fileName);
      const stateFilePath = runtimeTaskStatePath(projectId, fileName);
      try {
        const baseTask = await readJson(sourceFilePath);
        const runtimeState = await readJsonIfExists(stateFilePath);
        const task = applyRuntimeTaskState(baseTask, runtimeState);
        tasks.push({
          filePath: stateFilePath,
          sourceFilePath,
          task,
          runtimeState,
          canonicalStatePreferred: shouldPreferCanonicalControlState(baseTask, runtimeState),
        });
      } catch {
        // Ignore malformed tasks but keep dispatcher running.
      }
    }
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// Terminal task normalization
// ---------------------------------------------------------------------------
export function deepEqualJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function truncate(value, limit = MAX_LOG_BYTES) {
  return String(value || '').trim().slice(0, limit);
}

let _appendNormalizedLog = () => Promise.resolve();
export function registerNormalizedLogLogger(fn) {
  _appendNormalizedLog = fn;
}

export async function normalizeTerminalTasks(loadedTasks, nowIso) {
  for (const entry of loadedTasks) {
    const { task, filePath, runtimeState, canonicalStatePreferred } = entry;
    const normalizedStatus = normalizeTaskStatus(task.status);
    const terminal = TERMINAL_STATUSES.has(normalizedStatus);
    let changed = canonicalStatePreferred && !deepEqualJson(task, runtimeState);

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
      const needsResultNormalization =
        task.dispatch.last_result === 'running' || task.dispatch.last_result === 'launching';
      if (needsResultNormalization) {
        task.dispatch = {
          ...task.dispatch,
          last_result: 'completed',
          last_error: null,
        };
        changed = true;
      }
    }

    if (changed) {
      task.timestamps.updated_at = nowIso;
      await writeJson(filePath, task);
      await _appendNormalizedLog({
        ts: nowIso,
        task_id: task.task_id,
        action: 'terminal_state_normalized',
        status: task.status,
      });
    }
  }
}
