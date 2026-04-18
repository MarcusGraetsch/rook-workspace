#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const CANONICAL_ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'archive', 'tasks');
const RUNTIME_TASK_STATE_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'task-state');
const BACKUP_GLOB_ROOT = path.join(OPENCLAW_DIR, 'backup');

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

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
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

async function findBackupMatches(relativePath) {
  const matches = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(targetPath);
        continue;
      }
      if (entry.isFile() && targetPath.endsWith(relativePath)) {
        matches.push(targetPath);
      }
    }
  }

  if (await pathExists(BACKUP_GLOB_ROOT)) {
    await walk(BACKUP_GLOB_ROOT);
  }

  return matches.sort();
}

function isRestorableArchivedTask(task) {
  return (
    task
    && typeof task.task_id === 'string'
    && typeof task.project_id === 'string'
    && task.status === 'done'
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runtimeFiles = await collectJsonFiles(RUNTIME_TASK_STATE_DIR);
  const actions = [];

  for (const runtimePath of runtimeFiles.sort()) {
    const relativePath = path.relative(RUNTIME_TASK_STATE_DIR, runtimePath);
    const projectId = path.dirname(relativePath);
    const taskFile = path.basename(relativePath);
    const taskId = path.basename(relativePath, '.json');

    if (options.projectId && options.projectId !== projectId) {
      continue;
    }
    if (options.taskId && options.taskId !== taskId) {
      continue;
    }

    const canonicalPath = path.join(CANONICAL_TASKS_DIR, relativePath);
    const canonicalArchivePath = path.join(CANONICAL_ARCHIVE_TASKS_DIR, relativePath);
    if (await pathExists(canonicalPath) || await pathExists(canonicalArchivePath)) {
      continue;
    }

    const backupMatches = await findBackupMatches(path.join('operations', 'tasks', relativePath));
    if (backupMatches.length === 0) {
      continue;
    }

    const backupPath = backupMatches[backupMatches.length - 1];
    const backupTask = await readJson(backupPath);
    if (!isRestorableArchivedTask(backupTask)) {
      actions.push({
        action: 'skip_backup_restore',
        reason: 'backup_task_not_restorable_done_task',
        project_id: projectId,
        task_id: taskId,
        runtime_path: runtimePath,
        backup_path: backupPath,
      });
      continue;
    }

    actions.push({
      action: 'restore_archived_task_from_backup',
      project_id: projectId,
      task_id: taskId,
      runtime_path: runtimePath,
      backup_path: backupPath,
      canonical_archive_path: canonicalArchivePath,
      status: backupTask.status,
      related_repo: backupTask.related_repo || null,
    });

    if (options.apply) {
      await writeJson(canonicalArchivePath, backupTask);
    }
  }

  const summary = {
    checked_at: new Date().toISOString(),
    apply: options.apply,
    canonical_archive_tasks_dir: CANONICAL_ARCHIVE_TASKS_DIR,
    action_count: actions.length,
    actions,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
