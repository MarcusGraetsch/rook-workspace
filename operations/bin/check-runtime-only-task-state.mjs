#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const CANONICAL_ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'archive', 'tasks');
const RUNTIME_TASK_STATE_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'task-state');
const RUNTIME_ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'tasks');
const WORKSPACE_MAIN_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace-main', 'operations', 'tasks');
const BACKUP_GLOB_ROOT = path.join(OPENCLAW_DIR, 'backup');

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

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
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
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }
      if (targetPath.endsWith(relativePath)) {
        matches.push(targetPath);
      }
    }
  }

  if (await pathExists(BACKUP_GLOB_ROOT)) {
    await walk(BACKUP_GLOB_ROOT);
  }
  return matches.sort();
}

function classifyRuntimeOnlyFinding({ canonicalArchiveExists, runtimeArchiveExists, workspaceMainExists, backupMatches }) {
  const hasBackupMatches = Array.isArray(backupMatches) && backupMatches.length > 0;

  if (canonicalArchiveExists || runtimeArchiveExists) {
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

function relativeProjectTaskMap(rootDir, files) {
  const mapping = new Map();
  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath);
    const projectId = path.dirname(relativePath);
    const taskFile = path.basename(relativePath);
    if (!mapping.has(projectId)) {
      mapping.set(projectId, new Set());
    }
    mapping.get(projectId).add(taskFile);
  }
  return mapping;
}

async function main() {
  const canonicalFiles = await collectJsonFiles(CANONICAL_TASKS_DIR);
  const runtimeFiles = await collectJsonFiles(RUNTIME_TASK_STATE_DIR);
  const canonicalMap = relativeProjectTaskMap(CANONICAL_TASKS_DIR, canonicalFiles);
  const runtimeMap = relativeProjectTaskMap(RUNTIME_TASK_STATE_DIR, runtimeFiles);
  const findings = [];

  for (const [projectId, runtimeSet] of runtimeMap.entries()) {
    const canonicalSet = canonicalMap.get(projectId) || new Set();
    for (const taskFile of [...runtimeSet].sort()) {
      if (canonicalSet.has(taskFile)) {
        continue;
      }
      const relativePath = path.join(projectId, taskFile);
      const runtimeArchivePath = path.join(RUNTIME_ARCHIVE_TASKS_DIR, relativePath);
      const canonicalArchivePath = path.join(CANONICAL_ARCHIVE_TASKS_DIR, relativePath);
      const workspaceMainPath = path.join(WORKSPACE_MAIN_TASKS_DIR, relativePath);
      const backupMatches = await findBackupMatches(path.join('operations', 'tasks', relativePath));
      const canonicalArchiveExists = await pathExists(canonicalArchivePath);
      const runtimeArchiveExists = await pathExists(runtimeArchivePath);
      const workspaceMainExists = await pathExists(workspaceMainPath);
      const classification = classifyRuntimeOnlyFinding({
        canonicalArchiveExists,
        runtimeArchiveExists,
        workspaceMainExists,
        backupMatches,
      });

      findings.push({
        project_id: projectId,
        task_file: taskFile,
        runtime_path: path.join(RUNTIME_TASK_STATE_DIR, relativePath),
        canonical_archive_exists: canonicalArchiveExists,
        runtime_archive_exists: runtimeArchiveExists,
        workspace_main_exists: workspaceMainExists,
        backup_matches: backupMatches,
        ...classification,
      });
    }
  }

  const summary = {
    checked_at: new Date().toISOString(),
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    runtime_task_state_dir: RUNTIME_TASK_STATE_DIR,
    runtime_only_count: findings.length,
    findings,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
