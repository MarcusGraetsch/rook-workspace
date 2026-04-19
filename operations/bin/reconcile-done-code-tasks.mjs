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

function findingReason(task) {
  if (task.github_pull_request?.state === 'merged') {
    return null;
  }
  if (task.github_pull_request?.number) {
    return `task is done but PR #${task.github_pull_request.number} is ${task.github_pull_request.state || 'not merged'}`
  }
  if ((task.commit_refs || task.commits || []).length > 0) {
    return 'task is done with commit evidence but no merged PR evidence'
  }
  return 'task is done without merged PR evidence'
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

    const reason = findingReason(task);
    if (!reason) {
      continue;
    }

    findings.push({
      task_id: task.task_id,
      project_id: task.project_id,
      related_repo: task.related_repo,
      branch: task.branch,
      reason,
      pr_state: task.github_pull_request?.state || null,
      pr_number: task.github_pull_request?.number || null,
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
