#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'tasks');
const WORKSPACE_ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'archive', 'tasks');

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

  const summary = {
    checked_at: new Date().toISOString(),
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    archive_tasks_dir: ARCHIVE_TASKS_DIR,
    workspace_archive_tasks_dir: WORKSPACE_ARCHIVE_TASKS_DIR,
    ok: blockingDuplicates.length === 0 && activeMismatches.length === 0,
    duplicates: blockingDuplicates,
    mismatches: activeMismatches.sort((left, right) => left.file.localeCompare(right.file)),
    warnings: {
      active_archive_duplicate_task_ids: duplicateEntries.filter((entry) => entry.files.some((file) => file.scope !== 'active')),
      archive_mismatches: mismatches
        .filter((entry) => entry.scope !== 'active')
        .sort((left, right) => left.file.localeCompare(right.file)),
    },
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
