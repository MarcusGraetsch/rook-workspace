#!/usr/bin/env node
/**
 * repair-runtime-states.mjs
 *
 * One-time repair script for runtime task-state files with schema gaps.
 * Safe to run multiple times (idempotent).
 *
 * Repairs:
 *   1. Files missing `task_id`: back-fill from filename (filename === task_id by convention)
 *   2. Files missing `project_id`: back-fill from parent directory name
 *   3. Files missing `dispatch`: add empty dispatch object {}
 *
 * Usage:
 *   node repair-runtime-states.mjs [--apply] [--verbose]
 *   Default: dry-run (no writes). Pass --apply to write changes.
 */

import { promises as fs } from 'fs';
import path from 'path';

const RUNTIME_ROOT = process.env.ROOK_RUNTIME_ROOT || '/root/.openclaw/runtime';
const TASK_STATE_DIR = path.join(RUNTIME_ROOT, 'operations', 'task-state');

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, `${serialized}\n`, 'utf8');
}

async function repairFile(filePath, projectId) {
  let data;
  try {
    data = await readJson(filePath);
  } catch (err) {
    return { filePath, error: `parse error: ${err.message}`, repaired: false };
  }

  const fileName = path.basename(filePath, '.json');
  const repairs = [];

  if (!data.task_id) {
    data.task_id = fileName;
    repairs.push(`added task_id="${fileName}"`);
  }

  if (!data.project_id) {
    data.project_id = projectId;
    repairs.push(`added project_id="${projectId}"`);
  }

  if (data.dispatch === undefined) {
    data.dispatch = {};
    repairs.push('added dispatch={}');
  }

  if (repairs.length === 0) {
    if (VERBOSE) console.log(`  ok  ${path.relative(TASK_STATE_DIR, filePath)}`);
    return { filePath, repairs: [], repaired: false };
  }

  if (APPLY) {
    await writeJson(filePath, data);
  }

  return { filePath, repairs, repaired: true };
}

async function main() {
  const nowIso = new Date().toISOString();
  console.log(`repair-runtime-states ${APPLY ? '(APPLY)' : '(DRY-RUN)'}`);
  console.log(`state dir: ${TASK_STATE_DIR}`);
  console.log(`run at: ${nowIso}`);
  console.log();

  let projectDirs;
  try {
    projectDirs = await fs.readdir(TASK_STATE_DIR);
  } catch {
    console.error(`Cannot read task-state dir: ${TASK_STATE_DIR}`);
    process.exit(1);
  }

  const results = [];
  let parseErrors = 0;
  let repairedCount = 0;
  let checkedCount = 0;

  for (const projectId of projectDirs) {
    const projectDir = path.join(TASK_STATE_DIR, projectId);
    let stat;
    try {
      stat = await fs.stat(projectDir);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    let files;
    try {
      files = await fs.readdir(projectDir);
    } catch {
      continue;
    }

    for (const fileName of files) {
      if (!fileName.endsWith('.json')) continue;
      const filePath = path.join(projectDir, fileName);
      checkedCount += 1;
      const result = await repairFile(filePath, projectId);
      results.push(result);

      if (result.error) {
        parseErrors += 1;
        console.error(`  ERR ${path.relative(TASK_STATE_DIR, filePath)}: ${result.error}`);
      } else if (result.repaired) {
        repairedCount += 1;
        const prefix = APPLY ? ' FIX' : ' DRY';
        console.log(`${prefix} ${path.relative(TASK_STATE_DIR, filePath)}`);
        for (const r of result.repairs) {
          console.log(`       ${r}`);
        }
      }
    }
  }

  console.log();
  console.log(`Summary:`);
  console.log(`  checked:        ${checkedCount}`);
  console.log(`  repaired:       ${repairedCount}${APPLY ? '' : ' (dry-run, not written)'}`);
  console.log(`  parse errors:   ${parseErrors}`);

  if (!APPLY && repairedCount > 0) {
    console.log();
    console.log(`Run with --apply to write repairs.`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
