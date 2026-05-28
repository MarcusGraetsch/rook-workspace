#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
const CANONICAL_TASKS_DIR = process.env.ROOK_CANONICAL_TASKS_DIR
  || path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const ARCHIVE_TASKS_DIR = process.env.ROOK_ARCHIVE_TASKS_DIR
  || path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'tasks');
const QUARANTINE_ROOT = process.env.ROOK_ARCHIVE_TASK_QUARANTINE_DIR
  || path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'task-collisions');

function usage() {
  console.error([
    'Usage: plan-archive-task-cleanup.mjs [--task-id <id>] [--project <project-id>]',
    '',
    'Prints a read-only maintenance plan for historical task archive collisions.',
    'No files are modified.',
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    taskId: null,
    projectId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--task-id') {
      options.taskId = argv[++index];
    } else if (arg === '--project') {
      options.projectId = argv[++index];
    } else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else {
      usage();
      process.exit(2);
    }
  }

  return options;
}

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

async function readTaskFile(filePath, scope, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  const expectedProjectId = path.dirname(relativePath);
  const expectedTaskId = path.basename(relativePath, '.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const task = JSON.parse(raw);

  return {
    scope,
    file: filePath,
    relative_path: relativePath,
    expected_project_id: expectedProjectId,
    expected_task_id: expectedTaskId,
    task_id: task?.task_id || null,
    project_id: task?.project_id || null,
    title: task?.title || null,
    status: task?.status || null,
    updated_at: task?.timestamps?.updated_at || null,
  };
}

async function loadRecords() {
  const roots = [
    { scope: 'active', dir: CANONICAL_TASKS_DIR },
    { scope: 'archive', dir: ARCHIVE_TASKS_DIR },
  ];
  const records = [];
  const parse_errors = [];

  for (const root of roots) {
    const files = await collectJsonFiles(root.dir);
    for (const file of files) {
      try {
        records.push(await readTaskFile(file, root.scope, root.dir));
      } catch (error) {
        parse_errors.push({
          scope: root.scope,
          file,
          problem: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { records, parse_errors };
}

function quarantineTarget(record) {
  const projectId = record.project_id || record.expected_project_id || 'unknown-project';
  const fileName = path.basename(record.file);
  return path.join(QUARANTINE_ROOT, projectId, fileName);
}

function filterRecords(records, options) {
  return records.filter((record) => {
    if (options.taskId && record.task_id !== options.taskId) return false;
    if (options.projectId && record.project_id !== options.projectId && record.expected_project_id !== options.projectId) {
      return false;
    }
    return true;
  });
}

function buildPlan(records, parseErrors) {
  const byTaskId = new Map();
  for (const record of records) {
    if (!record.task_id) continue;
    const entries = byTaskId.get(record.task_id) || [];
    entries.push(record);
    byTaskId.set(record.task_id, entries);
  }

  const actions = [];

  for (const [taskId, entries] of [...byTaskId.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const activeEntries = entries.filter((entry) => entry.scope === 'active');
    const archiveEntries = entries.filter((entry) => entry.scope === 'archive');

    if (activeEntries.length > 0 && archiveEntries.length > 0) {
      for (const archive of archiveEntries) {
        actions.push({
          action: 'quarantine_archive_duplicate',
          task_id: taskId,
          project_id: archive.project_id,
          reason: 'same task_id exists in active canonical tasks and runtime archive',
          dry_run: true,
          source_file: archive.file,
          proposed_target_file: quarantineTarget(archive),
          active_files: activeEntries.map((entry) => entry.file),
          risk: 'medium',
          operator_note: 'Review before applying. Preserve the active canonical task; quarantine only the historical archive duplicate if it is not needed for restore evidence.',
        });
      }
    }

    if (archiveEntries.length > 1 && activeEntries.length === 0) {
      for (const archive of archiveEntries) {
        actions.push({
          action: 'review_archive_only_duplicate',
          task_id: taskId,
          project_id: archive.project_id,
          reason: 'multiple archived files share the same task_id',
          dry_run: true,
          source_file: archive.file,
          proposed_target_file: quarantineTarget(archive),
          risk: 'low',
          operator_note: 'No active task collides, but restore tooling may resolve this task ambiguously.',
        });
      }
    }
  }

  for (const record of records.filter((entry) => entry.scope === 'archive')) {
    if (record.task_id && record.expected_task_id && record.task_id !== record.expected_task_id) {
      actions.push({
        action: 'review_archive_filename_mismatch',
        task_id: record.task_id,
        project_id: record.project_id,
        reason: `archived filename implies ${record.expected_task_id}, file content declares ${record.task_id}`,
        dry_run: true,
        source_file: record.file,
        proposed_canonical_filename: path.join(path.dirname(record.file), `${record.task_id}.json`),
        risk: 'low',
        operator_note: 'Do not rename blindly if the suffix was deliberately added to preserve duplicate evidence.',
      });
    }
  }

  for (const error of parseErrors) {
    actions.push({
      action: 'review_unreadable_archive_task',
      reason: 'task JSON could not be parsed',
      dry_run: true,
      source_file: error.file,
      risk: error.scope === 'active' ? 'high' : 'medium',
      problem: error.problem,
      operator_note: 'Fix parse errors before attempting archive cleanup.',
    });
  }

  return actions.sort((left, right) => {
    const taskDelta = String(left.task_id || '').localeCompare(String(right.task_id || ''));
    if (taskDelta !== 0) return taskDelta;
    return String(left.action).localeCompare(String(right.action));
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { records, parse_errors } = await loadRecords();
  const filteredRecords = filterRecords(records, options);
  const filteredParseErrors = parse_errors.filter((error) => {
    if (options.projectId && !error.file.includes(`/${options.projectId}/`)) return false;
    return true;
  });
  const actions = buildPlan(filteredRecords, filteredParseErrors);
  const summary = {
    checked_at: new Date().toISOString(),
    mode: 'dry-run',
    ok: true,
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    archive_tasks_dir: ARCHIVE_TASKS_DIR,
    quarantine_root: QUARANTINE_ROOT,
    filters: {
      task_id: options.taskId,
      project_id: options.projectId,
    },
    active_task_file_count: filteredRecords.filter((record) => record.scope === 'active').length,
    archived_task_file_count: filteredRecords.filter((record) => record.scope === 'archive').length,
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
