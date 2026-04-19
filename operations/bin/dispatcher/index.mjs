import {
  buildDispatchState,
  runAgent,
  runtimeBlockStateChanged,
  evaluateResult,
  findHookAbort,
  readHookTranscriptState,
  evaluateHookTranscriptState,
  dispatchTask,
  taskRef,
  unresolvedDependencies,
} from './dispatch.mjs';
import { appendLog, appendAlert, notifyAndRecord, formatLifecycleMessage } from './notify.mjs';
import {
  loadTasks,
  normalizeTerminalTasks,
  writeJson,
  deepEqualJson,
  truncate,
  registerNormalizedLogLogger,
} from './loader.mjs';
import {
  registerDeadSessionCallbacks,
  isSessionDead,
  recoverDeadSession,
  isClaimStale,
  _taskHeartbeatIso as taskHeartbeatIso,
} from './claims.mjs';
import {
  validateStageCompletion,
  advanceStageAfterCompletion,
  isDispatchable,
} from './validation.mjs';
import { ensureSpecialistRepoView, runGh, maybePushAndCreatePR } from './github.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_STALE_CLAIM_MINUTES = Number(process.env.ROOK_STALE_CLAIM_MINUTES || '20');
const DEFAULT_MAX_ATTEMPTS = Number(process.env.ROOK_DISPATCH_MAX_ATTEMPTS || '3');
const MAX_LOG_BYTES = 4000;
const ACTIVE_STATUSES = new Set(['in_progress', 'testing', 'review']);

// ---------------------------------------------------------------------------
// Register logger callbacks for cross-module use
// ---------------------------------------------------------------------------
registerNormalizedLogLogger(async (entry) => {
  await appendLog(entry);
});
registerDeadSessionCallbacks({
  alert: appendAlert,
  log: appendLog,
  notify: notifyAndRecord,
});

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Local helpers (not exported from any module)
// ---------------------------------------------------------------------------
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

function isRetryableAbortReason(reason) {
  const text = String(reason || '').toLowerCase();
  if (!text) return false;
  return (
    text.includes('request was aborted')
    || text.includes('worker prompt aborted')
    || text.includes('assistant message aborted')
  );
}

// ---------------------------------------------------------------------------
// Hook claim inspection
// ---------------------------------------------------------------------------

async function inspectActiveHookClaims(loadedTasks, nowIso) {
  const nowMs = Date.now();
  for (const entry of loadedTasks) {
    const { task, filePath } = entry;
    const dispatch = task.dispatch && typeof task.dispatch === 'object' ? task.dispatch : null;

    // [agent:engineer][task:ops-0041] Auto-detect PR merge for tasks stuck in review.
    if (task.status === 'review' && task.github_pull_request?.number && task.github_pull_request?.repo) {
      const enteredReviewAt = task.timestamps?.updated_at ? Date.parse(task.timestamps.updated_at) : 0;
      const minutesInReview = (nowMs - enteredReviewAt) / 60000;
      if (minutesInReview > 5) {
        const repoPath = await ensureSpecialistRepoView(task, 'engineer');
        const prResult = await runGh(repoPath, ['pr', 'view', String(task.github_pull_request.number), '--repo', String(task.github_pull_request.repo), '--json', 'state,mergedAt']);
        if (prResult.code === 0) {
          try {
            const prData = JSON.parse(prResult.stdout);
            if (prData.state === 'MERGED') {
              task.status = 'done';
              task.workflow_stage = 'done';
              task.github_pull_request.state = 'merged';
              task.github_pull_request.last_synced_at = nowIso;
              task.timestamps.completed_at = prData.mergedAt || nowIso;
              task.timestamps.updated_at = nowIso;
              task.blocked_by = [];
              task.failure_reason = null;
              await writeJson(filePath, task);
              await notifyAndRecord(task, 'pr_auto_merged', `[dispatcher] ${task.task_id} auto-transitioned to done: PR #${task.github_pull_request.number} was merged`);
              await appendLog({ ts: nowIso, task_id: task.task_id, action: 'pr_merge_auto_detected', pr_number: task.github_pull_request.number, repo: task.github_pull_request.repo, merged_at: prData.mergedAt });
              continue;
            }
          } catch (parseErr) {
            await appendLog({ ts: nowIso, task_id: task.task_id, action: 'pr_merge_check_parse_error', pr_number: task.github_pull_request.number, repo: task.github_pull_request.repo, error: String(parseErr) });
          }
        } else {
          await appendLog({ ts: nowIso, task_id: task.task_id, action: 'pr_merge_check_failed', pr_number: task.github_pull_request.number, repo: task.github_pull_request.repo, gh_stderr: prResult.stderr });
        }
      }
    }

    if (!task.claimed_by || !ACTIVE_STATUSES.has(task.status)) {
      continue;
    }

    // Check for dead sessions
    if (isSessionDead(task, nowMs)) {
      await recoverDeadSession(entry, nowIso);
      continue;
    }

    if (dispatch?.mode !== 'hook' || !dispatch?.session_key) {
      continue;
    }

    const executor = String(dispatch.executor || task.claimed_by.replace(/^dispatcher:/, '') || '');
    if (!executor) continue;

    const state = await readHookTranscriptState(executor, dispatch.session_key);
    if (!state) continue;

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
        task.dispatch = buildDispatchState(task, executor, retryResult, retryAttempt, nextDispatch.mode || 'hook', new Date().toISOString());
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
          await notifyAndRecord(task, 'worker_retry_started', `[dispatcher] retrying ${task.task_id}: relaunched ${executor} after transient hook abort`);
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
      task.dispatch = { ...nextDispatch, last_result: 'aborted', last_error: task.failure_reason, last_checked_at: nowIso };
      await writeJson(filePath, task);
      await notifyAndRecord(task, 'worker_aborted', `[dispatcher] blocked ${task.task_id}: ${task.failure_reason}`);
      await appendLog({ ts: nowIso, task_id: task.task_id, action: 'hook_worker_aborted', executor, session_key: nextDispatch.session_key, session_id: nextDispatch.session_id, reason: task.failure_reason });
      continue;
    }

    const evaluation = evaluateHookTranscriptState(state);
    if (evaluation.done && evaluation.ok && evaluation.stopReason === 'stop') {
      // Push and PR non-blocking
      const pushResult = await maybePushAndCreatePR(task, executor);
      if (pushResult.error) {
        await appendLog({ ts: nowIso, task_id: task.task_id, action: 'push_pr_non_blocking_error', executor, pushed: pushResult.pushed, prCreated: pushResult.prCreated, error: pushResult.error });
      }

      const completionCheck = await validateStageCompletion(task, executor, nextDispatch.dispatched_status);
      if (!completionCheck.ok) {
        task.status = 'blocked';
        task.claimed_by = null;
        task.blocked_by = completionCheck.blockedBy;
        task.failure_reason = completionCheck.reason;
        task.timestamps.updated_at = nowIso;
        task.timestamps.claimed_at = null;
        task.last_heartbeat = latestEventTimestamp(state) || task.last_heartbeat || nowIso;
        task.dispatch = { ...nextDispatch, last_result: 'completed', last_error: completionCheck.reason, last_checked_at: nowIso };
        await writeJson(filePath, task);
        await notifyAndRecord(task, 'dispatch_blocked', `[dispatcher] blocked ${task.task_id}: ${completionCheck.reason}`);
        await appendLog({ ts: nowIso, task_id: task.task_id, action: 'hook_worker_blocked_on_completion', executor, session_key: nextDispatch.session_key, session_id: nextDispatch.session_id, reason: completionCheck.reason, blocked_by: completionCheck.blockedBy });
        continue;
      }

      const promotion = advanceStageAfterCompletion(task, executor, nextDispatch.dispatched_status, nowIso);
      task.claimed_by = null;
      task.timestamps.updated_at = nowIso;
      task.timestamps.claimed_at = null;
      task.last_heartbeat = latestEventTimestamp(state) || task.last_heartbeat || nowIso;
      task.dispatch = { ...nextDispatch, last_result: 'completed', last_error: null, last_checked_at: nowIso };
      await writeJson(filePath, task);
      await notifyAndRecord(task, 'worker_completed', formatLifecycleMessage(task, 'worker_completed', { executor }));
      if (promotion.advanced) {
        await notifyAndRecord(task, 'stage_advanced', `[dispatcher] advanced ${task.task_id} to ${promotion.nextStage} (stage owner: ${promotion.nextOwner})`);
      }
      await appendLog({ ts: nowIso, task_id: task.task_id, action: 'hook_worker_completed', executor, session_key: nextDispatch.session_key, session_id: nextDispatch.session_id, status: task.status, assigned_agent: task.assigned_agent, next_stage: promotion.nextStage });
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

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

export async function main() {
  const options = parseArgs(process.argv.slice(2));
  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const loadedTasks = await loadTasks();
  const taskMap = new Map(loadedTasks.map((entry) => [entry.task.task_id, entry]));

  await normalizeTerminalTasks(loadedTasks, nowIso);
  await inspectActiveHookClaims(loadedTasks, nowIso);

  for (const entry of loadedTasks) {
    const { task, filePath } = entry;
    if (!isClaimStale(task, nowMs)) continue;

    const previousClaim = task.claimed_by;
    const heartbeatIso = taskHeartbeatIso(task);
    task.status = 'blocked';
    task.claimed_by = null;
    task.failure_reason = `Stale claim released by dispatcher after ${DEFAULT_STALE_CLAIM_MINUTES}m without heartbeat. Previous claim: ${previousClaim || 'unknown'}; last heartbeat: ${heartbeatIso || 'missing'}.`;
    task.last_heartbeat = nowIso;
    task.timestamps.updated_at = nowIso;
    task.timestamps.claimed_at = null;
    await writeJson(filePath, task);
    await notifyAndRecord(task, 'stale_claim_released', formatLifecycleMessage(task, 'stale_claim_released', { previousClaim }));
    await appendLog({ ts: nowIso, task_id: task.task_id, action: 'stale_claim_released', previous_claim: previousClaim, last_heartbeat: heartbeatIso });
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
      const dependencyBlockChanged = runtimeBlockStateChanged(entry, blockers, task.failure_reason);
      if (dependencyBlockChanged) {
        await notifyAndRecord(task, 'dependency_block', `[dispatcher] blocked ${taskRef(task)}: waiting for dependencies ${blockers.join(', ')}`);
      }
      await appendLog({ ts: nowIso, task_id: task.task_id, action: 'dependency_block', blocked_by: blockers });
      continue;
    }

    await dispatchTask(entry, options, nowIso);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  await appendLog({ ts: new Date().toISOString(), action: 'fatal', error: message });
  process.exitCode = 1;
});
