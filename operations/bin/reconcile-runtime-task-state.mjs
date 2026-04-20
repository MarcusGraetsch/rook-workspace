#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const RUNTIME_TASK_STATE_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'task-state');
const ACTIVE_RUNTIME_STATUSES = new Set(['in_progress', 'testing', 'review', 'blocked']);

function parseArgs(argv) {
  const options = {
    apply: false,
    projectId: null,
    taskId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--project') options.projectId = argv[++index] || null;
    else if (arg === '--task') options.taskId = argv[++index] || null;
  }

  return options;
}

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
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function hasRuntimeSignal(task) {
  if (!task || typeof task !== 'object') {
    return false;
  }

  if (task.claimed_by || task.last_heartbeat || task.failure_reason) {
    return true;
  }

  const dispatch = task.dispatch;
  if (!dispatch || typeof dispatch !== 'object') {
    return false;
  }

  return Object.values(dispatch).some((value) => {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (typeof value === 'number') {
      return value > 0;
    }
    return true;
  });
}

function requiresRuntimeState(task) {
  const status = String(task?.status || '').trim().toLowerCase();

  if (ACTIVE_RUNTIME_STATUSES.has(status)) {
    return true;
  }

  if (status === 'done' || status === 'backlog' || status === 'intake') {
    return false;
  }

  return hasRuntimeSignal(task);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const canonicalFiles = await collectJsonFiles(CANONICAL_TASKS_DIR);
  const actions = [];

  for (const canonicalPath of canonicalFiles.sort()) {
    const relativePath = path.relative(CANONICAL_TASKS_DIR, canonicalPath);
    const projectId = path.dirname(relativePath);
    const taskFile = path.basename(relativePath);
    const taskId = path.basename(relativePath, '.json');

    if (options.projectId && options.projectId !== projectId) {
      continue;
    }
    if (options.taskId && options.taskId !== taskId) {
      continue;
    }

    const runtimePath = path.join(RUNTIME_TASK_STATE_DIR, relativePath);
    try {
      await fs.access(runtimePath);
      continue;
    } catch {
      // Missing runtime state is the case we want to reconcile.
    }

    const task = await readJson(canonicalPath);
    if (!requiresRuntimeState(task)) {
      continue;
    }

    actions.push({
      action: 'create_runtime_state',
      project_id: projectId,
      task_id: taskId,
      canonical_path: canonicalPath,
      runtime_path: runtimePath,
      payload: task,
    });
  }

  if (options.apply) {
    for (const action of actions) {
      await writeJson(action.runtime_path, action.payload);
    }
  }

  const summary = {
    checked_at: new Date().toISOString(),
    apply: options.apply,
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    runtime_task_state_dir: RUNTIME_TASK_STATE_DIR,
    action_count: actions.length,
    actions: actions.map(({ payload, ...rest }) => rest),
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
