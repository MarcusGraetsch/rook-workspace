import { writeJson } from './loader.mjs';

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const DEFAULT_STALE_CLAIM_MINUTES = Number(process.env.ROOK_STALE_CLAIM_MINUTES || '20');
const ACTIVE_STATUSES = new Set(['in_progress', 'testing', 'review']);

// Re-exported from task-dispatcher constants so callers don't need extra imports
export { DEFAULT_STALE_CLAIM_MINUTES };

// -----------------------------------------------------------------------
// Session / claim management
// -----------------------------------------------------------------------

function taskHeartbeatIso(task) {
  return task.last_heartbeat
    || task.timestamps?.claimed_at
    || task.timestamps?.updated_at
    || task.timestamps?.started_at
    || null;
}

export { taskHeartbeatIso as _taskHeartbeatIso }; // alias for internal reuse

export function isSessionDead(task, nowMs) {
  const dispatch = task.dispatch && typeof task.dispatch === 'object' ? task.dispatch : null;
  if (!dispatch) {
    return false;
  }

  const lastResult = dispatch.last_result;
  if (lastResult !== 'running' && lastResult !== 'launching') {
    return false;
  }

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

export function hasCompletedWork(task) {
  const handoffNotes = String(task.handoff_notes || '').trim();
  const commits = Array.isArray(task.commits) ? task.commits : [];
  const commitRefs = Array.isArray(task.commit_refs) ? task.commit_refs : [];
  return handoffNotes.length > 0 && (commits.length > 0 || commitRefs.length > 0);
}

export async function recoverDeadSession(entry, nowIso) {
  const { task, filePath } = entry;
  const previousClaim = task.claimed_by;
  const heartbeatIso = taskHeartbeatIso(task);
  const completedWork = hasCompletedWork(task);
  const recoveryStatus = completedWork ? 'done' : 'failed';
  const recoveryReason = completedWork
    ? `Dead session recovered: work appears complete (handoff_notes + commits present). Previous claim: ${previousClaim || 'unknown'}; last heartbeat: ${heartbeatIso || 'missing'}.`
    : `Dead session detected: no completion evidence found. Previous claim: ${previousClaim || 'unknown'}; last heartbeat: ${heartbeatIso || 'missing'}.`;

  const previousStatus = task.status;
  task.status = recoveryStatus;
  task.claimed_by = null;
  task.failure_reason = completedWork ? null : recoveryReason;
  task.blocked_by = completedWork ? [] : ['runtime:dead-session'];
  task.last_heartbeat = nowIso;
  task.timestamps.updated_at = nowIso;
  task.timestamps.claimed_at = null;

  if (recoveryStatus === 'done' && !task.timestamps.completed_at) {
    task.timestamps.completed_at = nowIso;
  }

  if (task.dispatch && typeof task.dispatch === 'object') {
    task.dispatch = {
      ...task.dispatch,
      last_result: completedWork ? 'completed' : 'failed',
      last_error: completedWork ? null : recoveryReason,
      last_checked_at: nowIso,
    };
  }

  await writeJson(filePath, task);

  await appendDeadSessionAlert({
    ts: nowIso,
    task_id: task.task_id,
    event: 'dead_session_recovered',
    previous_status: previousStatus,
    recovery_status: recoveryStatus,
    previous_claim: previousClaim,
    last_heartbeat: heartbeatIso,
    reason: recoveryReason,
    work_evidence: {
      handoff_notes_present: String(task.handoff_notes || '').trim().length > 0,
      commits_count: (Array.isArray(task.commits) ? task.commits : []).length,
      commit_refs_count: (Array.isArray(task.commit_refs) ? task.commit_refs : []).length,
    },
  });

  await appendDeadSessionLog({
    ts: nowIso,
    task_id: task.task_id,
    action: 'dead_session_recovered',
    previous_status: previousStatus,
    recovery_status: recoveryStatus,
    previous_claim: previousClaim,
    last_heartbeat: heartbeatIso,
    reason: recoveryReason,
  });

  await notifyDeadSession(
    task,
    'dead_session_recovered',
    completedWork
      ? `[dispatcher] recovered ${task.task_id}: dead session auto-completed (work evidence found)`
      : `[dispatcher] recovered ${task.task_id}: dead session marked failed (no work evidence)`
  );

  return { recoveryStatus, completedWork };
}

export function isClaimStale(task, nowMs) {
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

// -----------------------------------------------------------------------
// Forward-reference stubs for cross-module dependencies
// -----------------------------------------------------------------------
let appendDeadSessionAlert = () => Promise.resolve();
let appendDeadSessionLog = () => Promise.resolve();
let notifyDeadSession = () => Promise.resolve();

export function registerDeadSessionCallbacks({ alert, log, notify }) {
  if (alert) appendDeadSessionAlert = alert;
  if (log) appendDeadSessionLog = log;
  if (notify) notifyDeadSession = notify;
}
