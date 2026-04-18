#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const RUNTIME_OPERATIONS_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations');
const RUNTIME_TASK_STATE_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'task-state');
const RUNTIME_ARCHIVE_TASKS_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'archive', 'tasks');
const RUNTIME_ARCHIVE_OVERLAYS_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'archive', 'runtime-task-state');
const WORKSPACE_MAIN_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace-main', 'operations', 'tasks');
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

function classifyRuntimeOnlyFinding({ runtimeArchiveExists, workspaceMainExists, backupMatches }) {
  const hasBackupMatches = Array.isArray(backupMatches) && backupMatches.length > 0;

  if (runtimeArchiveExists) {
    return {
      classification: 'stale_runtime_overlay_for_archived_task',
      recommended_action: 'prune_runtime_overlay',
    };
  }

  if (workspaceMainExists) {
    return {
      classification: 'runtime_overlay_with_workspace_main_evidence',
      recommended_action: 'compare_against_workspace_main',
    };
  }

  if (hasBackupMatches) {
    return {
      classification: 'backup_only_task_evidence',
      recommended_action: 'review_for_restore_or_archive',
    };
  }

  return {
    classification: 'orphan_runtime_overlay',
    recommended_action: 'manual_investigation',
  };
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
    if (await pathExists(canonicalPath)) {
      continue;
    }

    const runtimeArchivePath = path.join(RUNTIME_ARCHIVE_TASKS_DIR, relativePath);
    const workspaceMainPath = path.join(WORKSPACE_MAIN_TASKS_DIR, relativePath);
    const backupMatches = await findBackupMatches(path.join('operations', 'tasks', relativePath));
    const runtimeArchiveExists = await pathExists(runtimeArchivePath);
    const workspaceMainExists = await pathExists(workspaceMainPath);
    const classification = classifyRuntimeOnlyFinding({
      runtimeArchiveExists,
      workspaceMainExists,
      backupMatches,
    });

    if (classification.classification !== 'stale_runtime_overlay_for_archived_task') {
      continue;
    }

    const archiveOverlayPath = path.join(RUNTIME_ARCHIVE_OVERLAYS_DIR, relativePath);
    actions.push({
      action: 'archive_runtime_overlay',
      project_id: projectId,
      task_id: taskId,
      runtime_path: runtimePath,
      archive_overlay_path: archiveOverlayPath,
      runtime_archive_exists: runtimeArchiveExists,
      workspace_main_exists: workspaceMainExists,
      backup_matches: backupMatches,
      ...classification,
    });
  }

  if (options.apply) {
    for (const action of actions) {
      await fs.mkdir(path.dirname(action.archive_overlay_path), { recursive: true });
      await fs.rename(action.runtime_path, action.archive_overlay_path);
    }
  }

  const summary = {
    checked_at: new Date().toISOString(),
    apply: options.apply,
    runtime_task_state_dir: RUNTIME_TASK_STATE_DIR,
    runtime_archive_overlays_dir: RUNTIME_ARCHIVE_OVERLAYS_DIR,
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
