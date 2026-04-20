#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');

async function collectJsonFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const targetPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(targetPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(targetPath);
    }
  }

  return files;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function isCodeTask(task) {
  return Boolean(task?.related_repo && task?.branch);
}

function classifyFinding(task) {
  if (task.github_pull_request?.state === 'merged') {
    return null;
  }
  if (task.github_pull_request?.number) {
    return {
      classification: 'open_or_unmerged_pr',
      reason: `task is done but PR #${task.github_pull_request.number} is ${task.github_pull_request.state || 'not merged'}`,
      remediation: {
        summary: 'The task is marked done while its PR is still open or otherwise unmerged.',
        operator_action: 'Either merge/close the PR and sync the canonical metadata, or move the task out of done if review is still active.',
      },
    }
  }
  if (task.branch === 'main') {
    return {
      classification: 'direct_to_main_without_merge_evidence',
      reason: 'task is done on main with commit evidence but no merged PR evidence',
      remediation: {
        summary: 'This task appears to have been completed directly on main.',
        operator_action: 'Confirm that direct-to-main completion was intentional. If yes, document it as a direct-main exception; otherwise add durable PR evidence or reopen the task.',
      },
    }
  }
  if ((task.commit_refs || task.commits || []).length > 0) {
    return {
      classification: 'commit_evidence_without_pr_metadata',
      reason: 'task is done with commit evidence but no merged PR evidence',
      remediation: {
        summary: 'The task records commits, but canonical metadata has no merged PR evidence.',
        operator_action: 'Backfill the missing PR metadata if the work was merged, or document why this task is an accepted non-PR exception.',
      },
    }
  }
  return {
    classification: 'done_without_merge_evidence',
    reason: 'task is done without merged PR evidence',
    remediation: {
      summary: 'The task is marked done without commits or merged PR evidence in canonical metadata.',
      operator_action: 'Reopen the task or add durable completion evidence before treating it as reconciled.',
    },
  }
}

async function main() {
  const files = await collectJsonFiles(CANONICAL_TASKS_DIR);
  const findings = [];

  for (const filePath of files) {
    let task;
    try {
      task = await readJson(filePath);
    } catch {
      continue;
    }

    if (task?.status !== 'done' || !isCodeTask(task)) {
      continue;
    }

    const classification = classifyFinding(task);
    if (!classification) {
      continue;
    }

    findings.push({
      task_id: task.task_id,
      project_id: task.project_id,
      related_repo: task.related_repo,
      branch: task.branch,
      reason: classification.reason,
      classification: classification.classification,
      pr_state: task.github_pull_request?.state || null,
      pr_number: task.github_pull_request?.number || null,
      remediation: classification.remediation,
    });
  }

  findings.sort((left, right) => {
    if (left.project_id !== right.project_id) {
      return left.project_id.localeCompare(right.project_id);
    }
    return left.task_id.localeCompare(right.task_id);
  });

  const summary = {
    checked_at: new Date().toISOString(),
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    ok: true,
    finding_count: findings.length,
    findings,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
