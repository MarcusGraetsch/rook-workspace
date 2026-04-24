import { TASKS_DIR } from './loader.mjs';
import { repoViewPath, collectTaskGitEvidence } from './github.mjs';

// -----------------------------------------------------------------------
// Constants (from original)
// -----------------------------------------------------------------------
const BOOTSTRAP_SPECIALISTS = new Set(['test', 'review']);
const STAGE_FALLBACK_ENABLED = process.env.ROOK_STAGE_FALLBACK_ENABLED !== '0';

// -----------------------------------------------------------------------
// Executor selection
// -----------------------------------------------------------------------

export function statusForExecutor(agentId) {
  if (agentId === 'test') return 'testing';
  if (agentId === 'review') return 'review';
  return 'in_progress';
}

export function pickExecutor(task) {
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

export function statusForDispatch(task, executor) {
  if (task.status === 'testing' && task.assigned_agent === 'test') {
    return 'testing';
  }

  if (task.status === 'review' && task.assigned_agent === 'review') {
    return 'review';
  }

  return statusForExecutor(executor);
}

export function isDispatchable(task) {
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

// -----------------------------------------------------------------------
// Stage advancement
// -----------------------------------------------------------------------

export function advanceStageAfterCompletion(task, executor, launchedStatus, nowIso) {
  const currentStatus = String(launchedStatus || task.status || '');

  if (currentStatus === 'in_progress' && executor === 'engineer') {
    if (Array.isArray(task.checklist) && task.checklist.length > 0) {
      task.checklist = task.checklist.map((item) => ({
        ...item,
        completed: true,
      }));
    }
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

// -----------------------------------------------------------------------
// Stage completion validation
// -----------------------------------------------------------------------

export async function validateStageCompletion(task, executor, launchedStatus) {
  const stage = String(launchedStatus || task.status || '');
  const labels = new Set(Array.isArray(task.labels) ? task.labels : []);
  const isConsultingTask = task.assigned_agent === 'coach' || labels.has('consulting') || labels.has('coaching');
  const isCodeTask = Boolean(task.related_repo && task.branch) && !isConsultingTask;

  if (stage === 'in_progress') {
    const handoff = String(task.handoff_notes || '').trim();
    if (!handoff) {
      return {
        ok: false,
        reason: `${task.task_id} completed but is missing handoff_notes. All agents must document what was done.`,
        blockedBy: ['agent:missing-handoff'],
      };
    }
  }

  if (!isCodeTask) {
    return { ok: true, reason: null, blockedBy: [] };
  }

  if (stage === 'testing') {
    const commands = Array.isArray(task.test_evidence?.commands) ? task.test_evidence.commands.filter(Boolean) : [];
    const rawStatus = String(task.test_evidence?.status || '').trim().toLowerCase();
    const status = rawStatus === 'pass' ? 'passed' : (rawStatus || null);
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
    const rawVerdict = String(task.review_evidence?.verdict || '').trim().toLowerCase();
    const verdict = rawVerdict === 'pass' ? 'approved' : (rawVerdict || null);
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

// -----------------------------------------------------------------------
// Task summarization
// -----------------------------------------------------------------------

export function summarizeTask(task, executor) {
  const canonicalTaskFile = path.join(TASKS_DIR, task.project_id, `${task.task_id}.json`);
  const localRepoView = repoViewPath(task, executor);
  const stageOwner = task.assigned_agent || executor;
  const workspaceRepoHint = task.related_repo === 'MarcusGraetsch/rook-workspace'
    ? 'Repo layout hint: product code may live in nested project paths such as engineering/rook-dashboard rather than the workspace root.'
    : null;
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
    workspaceRepoHint,
    fallbackNote,
    task.handoff_notes ? `Notes: ${task.handoff_notes}` : null,
    checklistLines.length > 0 ? `Checklist:\n${checklistLines.join('\n')}` : null,
    task.plan?.approach ? `Plan — Approach: ${task.plan.approach}` : null,
    Array.isArray(task.plan?.scope) && task.plan.scope.length > 0
      ? `Plan — Scope: ${task.plan.scope.join('; ')}`
      : null,
    Array.isArray(task.plan?.out_of_scope) && task.plan.out_of_scope.length > 0
      ? `Plan — Out of scope: ${task.plan.out_of_scope.join('; ')}`
      : null,
    Array.isArray(task.plan?.steps) && task.plan.steps.length > 0
      ? `Plan — Steps:\n${task.plan.steps.map((s, i) => `${s.completed ? '[x]' : '[ ]'} ${i + 1}. ${s.title} (${s.owner})`).join('\n')}`
      : null,
    Array.isArray(task.plan?.acceptance_criteria) && task.plan.acceptance_criteria.length > 0
      ? `Plan — Acceptance criteria:\n${task.plan.acceptance_criteria.map((ac) => `- ${ac.description}${ac.met === true ? ' ✓' : ac.met === false ? ' ✗' : ''}`).join('\n')}`
      : null,
    Array.isArray(task.plan?.risks) && task.plan.risks.length > 0
      ? `Plan — Risks: ${task.plan.risks.join('; ')}`
      : null,
    task.plan?.context ? `Plan — Context: ${task.plan.context}` : null,
    task.test_evidence ? `Test evidence: ${JSON.stringify(task.test_evidence)}` : null,
    task.review_evidence ? `Review evidence: ${JSON.stringify(task.review_evidence)}` : null,
    task.description ? `Goal: ${task.description}` : null,
    `Required: work only on this task, use commit prefix [agent:${executor}][task:${task.task_id}], record artifacts in the canonical file, and if blocked update failure_reason/blocked_by in the canonical file.`,
    checklistLines.length > 0
      ? 'Treat the checklist as part of the task contract. Complete the relevant items or update them honestly if scope changes.'
      : null,
    String(task.status || '') === 'in_progress'
      ? 'Before completing engineer work: update handoff_notes with what changed and the exact validation commands/results you ran, and mark the implemented checklist items complete in the canonical task.'
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

import path from 'path';
export { summarizeTask as _summarizeTask }; // alias for internal reuse
