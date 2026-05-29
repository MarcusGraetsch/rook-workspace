#!/usr/bin/env node

import { promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'tasks');
const WORKSPACE_ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'archive', 'tasks');
const WORKSPACE_OPERATIONS_DIR = process.env.ROOK_WORKSPACE_OPERATIONS_DIR
  || path.join(OPENCLAW_DIR, 'workspace', 'operations');
const HISTORICAL_COLLISION_MANIFESTS_DIR = process.env.ROOK_HISTORICAL_COLLISION_MANIFESTS_DIR
  || path.join(WORKSPACE_OPERATIONS_DIR, 'archive', 'task-collisions');

async function collectJsonFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
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

function isInside(childPath, parentPath) {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(filePath));
  return hash.digest('hex');
}

function approvedCollisionKey(taskId, archivedFile, activeFile) {
  return `${taskId}\0${path.resolve(archivedFile)}\0${path.resolve(activeFile)}`;
}

async function loadApprovedHistoricalCollisions() {
  const files = await collectJsonFiles(HISTORICAL_COLLISION_MANIFESTS_DIR);
  const approved = new Set();
  const manifests = [];
  const manifest_errors = [];

  for (const file of files) {
    try {
      const manifest = await readJson(file);
      const activeRelativePath = manifest?.active_task?.relative_path;
      const archivedRelativePath = manifest?.archived_task?.relative_path;
      const activeFile = activeRelativePath ? path.join(WORKSPACE_OPERATIONS_DIR, activeRelativePath) : null;
      const archivedFile = archivedRelativePath ? path.join(WORKSPACE_OPERATIONS_DIR, archivedRelativePath) : null;
      const issues = [];

      if (manifest?.manifest_version !== 1) issues.push('manifest_version must be 1');
      if (manifest?.collision_type !== 'historical_task_id_collision') issues.push('collision_type must be historical_task_id_collision');
      if (manifest?.status !== 'accepted') issues.push('status must be accepted');
      if (!manifest?.task_id) issues.push('task_id is required');
      if (!activeFile) issues.push('active_task.relative_path is required');
      if (!archivedFile) issues.push('archived_task.relative_path is required');
      if (!manifest?.active_task?.sha256) issues.push('active_task.sha256 is required');
      if (!manifest?.archived_task?.sha256) issues.push('archived_task.sha256 is required');

      if (activeFile && !isInside(activeFile, WORKSPACE_OPERATIONS_DIR)) {
        issues.push('active_task.relative_path must stay inside workspace operations');
      }
      if (archivedFile && !isInside(archivedFile, WORKSPACE_OPERATIONS_DIR)) {
        issues.push('archived_task.relative_path must stay inside workspace operations');
      }

      if (issues.length === 0) {
        const [activeSha, archivedSha] = await Promise.all([
          sha256File(activeFile),
          sha256File(archivedFile),
        ]);
        if (activeSha !== manifest.active_task.sha256) issues.push('active_task.sha256 does not match current file');
        if (archivedSha !== manifest.archived_task.sha256) issues.push('archived_task.sha256 does not match current file');
      }

      if (issues.length === 0) {
        approved.add(approvedCollisionKey(manifest.task_id, archivedFile, activeFile));
      }

      manifests.push({
        file,
        task_id: manifest?.task_id || null,
        status: manifest?.status || null,
        ok: issues.length === 0,
        issues,
      });
    } catch (error) {
      manifest_errors.push({
        file,
        problem: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { approved, manifests, manifest_errors };
}

function isApprovedHistoricalDuplicate(entry, approvedHistoricalCollisions) {
  const activeFiles = entry.files.filter((file) => file.scope === 'active');
  const archiveFiles = entry.files.filter((file) => file.scope === 'workspace_archive');

  return archiveFiles.length > 0 && archiveFiles.every((archiveFile) => (
    activeFiles.some((activeFile) => (
      approvedHistoricalCollisions.has(approvedCollisionKey(entry.task_id, archiveFile.file, activeFile.file))
    ))
  ));
}

async function main() {
  const roots = [
    { scope: 'active', dir: CANONICAL_TASKS_DIR },
    { scope: 'archive', dir: ARCHIVE_TASKS_DIR },
    { scope: 'workspace_archive', dir: WORKSPACE_ARCHIVE_TASKS_DIR },
  ];
  const filesByRoot = await Promise.all(
    roots.map(async (root) => ({
      ...root,
      files: await collectJsonFiles(root.dir),
    })),
  );
  const duplicates = new Map();
  const mismatches = [];
  const historicalCollisions = await loadApprovedHistoricalCollisions();

  for (const root of filesByRoot) {
    for (const filePath of root.files) {
      const relativePath = path.relative(root.dir, filePath);
      const expectedProjectId = path.dirname(relativePath);
      const expectedTaskId = path.basename(relativePath, '.json');

      let parsed;
      try {
        parsed = await readJson(filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        mismatches.push({
          scope: root.scope,
          file: filePath,
          problem: `json_parse_error: ${message}`,
        });
        continue;
      }

      if (!parsed?.task_id) {
        mismatches.push({
          scope: root.scope,
          file: filePath,
          problem: 'missing_task_id',
        });
        continue;
      }

      if (!parsed?.project_id) {
        mismatches.push({
          scope: root.scope,
          file: filePath,
          problem: 'missing_project_id',
        });
      }

      if (parsed.task_id !== expectedTaskId) {
        mismatches.push({
          scope: root.scope,
          file: filePath,
          problem: `task_id_filename_mismatch: expected ${expectedTaskId}, got ${parsed.task_id}`,
        });
      }

      if (parsed.project_id !== expectedProjectId) {
        mismatches.push({
          scope: root.scope,
          file: filePath,
          problem: `project_id_path_mismatch: expected ${expectedProjectId}, got ${parsed.project_id}`,
        });
      }

      const existing = duplicates.get(parsed.task_id) || [];
      existing.push({ scope: root.scope, file: filePath });
      duplicates.set(parsed.task_id, existing);
    }
  }

  const duplicateEntries = [...duplicates.entries()]
    .filter(([, entries]) => entries.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([taskId, entries]) => ({
      task_id: taskId,
      files: entries
        .sort((left, right) => left.file.localeCompare(right.file))
        .map((entry) => ({
          scope: entry.scope,
          file: entry.file,
        })),
    }));
  const blockingDuplicates = duplicateEntries.filter((entry) => {
    const activeCount = entry.files.filter((file) => file.scope === 'active').length;
    return activeCount > 1;
  });
  const activeMismatches = mismatches.filter((entry) => entry.scope === 'active');
  const warningDuplicates = duplicateEntries.filter((entry) => (
    entry.files.some((file) => file.scope !== 'active')
    && !isApprovedHistoricalDuplicate(entry, historicalCollisions.approved)
  ));

  const summary = {
    checked_at: new Date().toISOString(),
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    archive_tasks_dir: ARCHIVE_TASKS_DIR,
    workspace_archive_tasks_dir: WORKSPACE_ARCHIVE_TASKS_DIR,
    historical_collision_manifests_dir: HISTORICAL_COLLISION_MANIFESTS_DIR,
    ok: blockingDuplicates.length === 0 && activeMismatches.length === 0,
    duplicates: blockingDuplicates,
    mismatches: activeMismatches.sort((left, right) => left.file.localeCompare(right.file)),
    warnings: {
      active_archive_duplicate_task_ids: warningDuplicates,
      archive_mismatches: mismatches
        .filter((entry) => entry.scope !== 'active')
        .sort((left, right) => left.file.localeCompare(right.file)),
      historical_collision_manifest_errors: historicalCollisions.manifest_errors,
    },
    approved_historical_collision_count: historicalCollisions.manifests.filter((manifest) => manifest.ok).length,
    historical_collision_manifests: historicalCollisions.manifests,
    task_file_count: filesByRoot.reduce((count, root) => count + root.files.length, 0),
    active_task_file_count: filesByRoot.find((root) => root.scope === 'active')?.files.length || 0,
    archived_task_file_count: filesByRoot
      .filter((root) => root.scope !== 'active')
      .reduce((count, root) => count + root.files.length, 0),
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
