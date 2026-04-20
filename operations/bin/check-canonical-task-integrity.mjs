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

async function main() {
  const files = await collectJsonFiles(CANONICAL_TASKS_DIR);
  const duplicates = new Map();
  const mismatches = [];

  for (const filePath of files) {
    const relativePath = path.relative(CANONICAL_TASKS_DIR, filePath);
    const expectedProjectId = path.dirname(relativePath);
    const expectedTaskId = path.basename(relativePath, '.json');

    let parsed;
    try {
      parsed = await readJson(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      mismatches.push({
        file: filePath,
        problem: `json_parse_error: ${message}`,
      });
      continue;
    }

    if (!parsed?.task_id) {
      mismatches.push({
        file: filePath,
        problem: 'missing_task_id',
      });
      continue;
    }

    if (!parsed?.project_id) {
      mismatches.push({
        file: filePath,
        problem: 'missing_project_id',
      });
    }

    if (parsed.task_id !== expectedTaskId) {
      mismatches.push({
        file: filePath,
        problem: `task_id_filename_mismatch: expected ${expectedTaskId}, got ${parsed.task_id}`,
      });
    }

    if (parsed.project_id !== expectedProjectId) {
      mismatches.push({
        file: filePath,
        problem: `project_id_path_mismatch: expected ${expectedProjectId}, got ${parsed.project_id}`,
      });
    }

    const existing = duplicates.get(parsed.task_id) || [];
    existing.push(filePath);
    duplicates.set(parsed.task_id, existing);
  }

  const duplicateEntries = [...duplicates.entries()]
    .filter(([, paths]) => paths.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([taskId, paths]) => ({
      task_id: taskId,
      files: paths.sort(),
    }));

  const summary = {
    checked_at: new Date().toISOString(),
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    ok: duplicateEntries.length === 0 && mismatches.length === 0,
    duplicates: duplicateEntries,
    mismatches: mismatches.sort((left, right) => left.file.localeCompare(right.file)),
    task_file_count: files.length,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
