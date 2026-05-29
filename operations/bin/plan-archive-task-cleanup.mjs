#!/usr/bin/env node

import { promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
const CANONICAL_TASKS_DIR = process.env.ROOK_CANONICAL_TASKS_DIR
  || path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const ARCHIVE_TASKS_DIR = process.env.ROOK_ARCHIVE_TASKS_DIR
  || path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'tasks');
const WORKSPACE_ARCHIVE_TASKS_DIR = process.env.ROOK_WORKSPACE_ARCHIVE_TASKS_DIR
  || path.join(OPENCLAW_DIR, 'workspace', 'operations', 'archive', 'tasks');
const WORKSPACE_OPERATIONS_DIR = process.env.ROOK_WORKSPACE_OPERATIONS_DIR
  || path.join(OPENCLAW_DIR, 'workspace', 'operations');
const HISTORICAL_COLLISION_MANIFESTS_DIR = process.env.ROOK_HISTORICAL_COLLISION_MANIFESTS_DIR
  || path.join(WORKSPACE_OPERATIONS_DIR, 'archive', 'task-collisions');
const QUARANTINE_ROOT = process.env.ROOK_ARCHIVE_TASK_QUARANTINE_DIR
  || path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'task-collisions');
const BACKUP_ROOT = process.env.ROOK_RUNTIME_BACKUP_ROOT || '/root/backups/rook-runtime';
const BACKUP_MAX_AGE_HOURS = Number(process.env.ROOK_RUNTIME_BACKUP_MAX_AGE_HOURS || '24');
const REVIEWED_RUNTIME_DUPLICATES = new Set([
  'dashboard-0043',
  'ops-0013',
  'ops-0018',
  'ops-0019',
  'ops-0028',
  'ops-0036',
]);
const REQUIRED_BACKUP_FILES = [
  'operations/tasks.tar.gz',
  'operations/runtime-state.tar.gz',
  'manifests/backup-manifest.txt',
  'manifests/git-heads.txt',
  'manifests/git-status.txt',
];

function usage() {
  console.error([
    'Usage: plan-archive-task-cleanup.mjs [--task-id <id>] [--project <project-id>] [--apply] [--allow-reviewed]',
    '',
    'Prints a maintenance plan for historical task archive collisions.',
    'Default mode is read-only. Apply mode is limited to reviewed runtime archive duplicates.',
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    apply: false,
    allowReviewed: false,
    taskId: null,
    projectId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--task-id') {
      options.taskId = argv[++index];
    } else if (arg === '--project') {
      options.projectId = argv[++index];
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--allow-reviewed') {
      options.allowReviewed = true;
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

function assertApplyOptions(options) {
  if (!options.apply) return;
  if (!options.taskId && !options.allowReviewed) {
    throw new Error('Refusing --apply without --task-id or --allow-reviewed.');
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
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

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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

async function listBackupDirs(rootDir) {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(rootDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function statFile(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

async function checkFreshRuntimeBackup() {
  const backupDirs = await listBackupDirs(BACKUP_ROOT);
  const latestBackup = backupDirs.at(-1) || null;
  const issues = [];

  if (!latestBackup) {
    issues.push(`no backup directories found under ${BACKUP_ROOT}`);
  } else {
    const backupStat = await statFile(latestBackup);
    const ageMs = backupStat ? Date.now() - backupStat.mtimeMs : Number.POSITIVE_INFINITY;
    const maxAgeMs = BACKUP_MAX_AGE_HOURS * 60 * 60 * 1000;

    if (!backupStat || !backupStat.isDirectory()) {
      issues.push(`${latestBackup} is not a readable directory`);
    } else if (ageMs > maxAgeMs) {
      issues.push(`${latestBackup} is older than ${BACKUP_MAX_AGE_HOURS} hours`);
    }

    for (const relativeFile of REQUIRED_BACKUP_FILES) {
      const targetPath = path.join(latestBackup, relativeFile);
      const fileStat = await statFile(targetPath);
      if (!fileStat?.isFile() || fileStat.size === 0) {
        issues.push(`${targetPath} missing or empty`);
      }
    }
  }

  return {
    ok: issues.length === 0,
    backup_root: BACKUP_ROOT,
    latest_backup: latestBackup,
    max_age_hours: BACKUP_MAX_AGE_HOURS,
    issues,
  };
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

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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
      const manifest = await readJsonFile(file);
      const activeRelativePath = manifest?.active_task?.relative_path;
      const archivedRelativePath = manifest?.archived_task?.relative_path;
      const activeFile = activeRelativePath ? path.join(WORKSPACE_OPERATIONS_DIR, activeRelativePath) : null;
      const archivedFile = archivedRelativePath ? path.join(WORKSPACE_OPERATIONS_DIR, archivedRelativePath) : null;
      const expectedActiveSha = manifest?.active_task?.sha256;
      const expectedArchivedSha = manifest?.archived_task?.sha256;
      const issues = [];

      if (manifest?.manifest_version !== 1) issues.push('manifest_version must be 1');
      if (manifest?.collision_type !== 'historical_task_id_collision') issues.push('collision_type must be historical_task_id_collision');
      if (manifest?.status !== 'accepted') issues.push('status must be accepted');
      if (!manifest?.task_id) issues.push('task_id is required');
      if (!activeFile) issues.push('active_task.relative_path is required');
      if (!archivedFile) issues.push('archived_task.relative_path is required');
      if (!expectedActiveSha) issues.push('active_task.sha256 is required');
      if (!expectedArchivedSha) issues.push('archived_task.sha256 is required');

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
        if (activeSha !== expectedActiveSha) issues.push('active_task.sha256 does not match current file');
        if (archivedSha !== expectedArchivedSha) issues.push('archived_task.sha256 does not match current file');
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

async function loadRecords() {
  const roots = [
    { scope: 'active', dir: CANONICAL_TASKS_DIR },
    { scope: 'archive', dir: ARCHIVE_TASKS_DIR },
    { scope: 'workspace_archive', dir: WORKSPACE_ARCHIVE_TASKS_DIR },
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

function hasApprovedHistoricalCollision(approvedHistoricalCollisions, taskId, archiveEntry, activeEntries) {
  if (archiveEntry.scope !== 'workspace_archive') return false;
  return activeEntries.some((activeEntry) => (
    approvedHistoricalCollisions.has(approvedCollisionKey(taskId, archiveEntry.file, activeEntry.file))
  ));
}

function buildPlan(records, parseErrors, approvedHistoricalCollisions, manifestErrors) {
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
    const archiveEntries = entries.filter((entry) => entry.scope !== 'active');

    if (activeEntries.length > 0 && archiveEntries.length > 0) {
      for (const archive of archiveEntries) {
        if (hasApprovedHistoricalCollision(approvedHistoricalCollisions, taskId, archive, activeEntries)) {
          continue;
        }
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

  for (const record of records.filter((entry) => entry.scope !== 'active')) {
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

  for (const error of manifestErrors) {
    actions.push({
      action: 'review_invalid_historical_collision_manifest',
      reason: 'historical collision manifest could not be parsed',
      dry_run: true,
      source_file: error.file,
      risk: 'medium',
      problem: error.problem,
      operator_note: 'Fix manifest parse errors before relying on historical collision suppression.',
    });
  }

  return actions.sort((left, right) => {
    const taskDelta = String(left.task_id || '').localeCompare(String(right.task_id || ''));
    if (taskDelta !== 0) return taskDelta;
    return String(left.action).localeCompare(String(right.action));
  });
}

function canApplyAction(action, options) {
  if (action.action !== 'quarantine_archive_duplicate') {
    return {
      ok: false,
      reason: `unsupported apply action ${action.action}`,
    };
  }
  if (!isInside(action.source_file, ARCHIVE_TASKS_DIR)) {
    return {
      ok: false,
      reason: 'refusing non-runtime archive source; workspace archive records require a migration note',
    };
  }
  if (options.allowReviewed && !REVIEWED_RUNTIME_DUPLICATES.has(action.task_id)) {
    return {
      ok: false,
      reason: `${action.task_id} is not in the reviewed runtime duplicate allowlist`,
    };
  }
  return { ok: true, reason: null };
}

async function applyActions(actions, options) {
  const backup = await checkFreshRuntimeBackup();
  const results = [];

  if (!backup.ok) {
    return {
      applied_count: 0,
      skipped_count: actions.length,
      backup,
      results: actions.map((action) => ({
        ...action,
        applied: false,
        refusal: 'fresh runtime backup preflight failed',
      })),
    };
  }

  for (const action of actions) {
    const allowed = canApplyAction(action, options);
    if (!allowed.ok) {
      results.push({
        ...action,
        applied: false,
        refusal: allowed.reason,
      });
      continue;
    }

    if (!await pathExists(action.source_file)) {
      results.push({
        ...action,
        applied: false,
        refusal: 'source file no longer exists',
      });
      continue;
    }

    const targetFile = action.proposed_target_file;
    if (await pathExists(targetFile)) {
      results.push({
        ...action,
        applied: false,
        refusal: 'target file already exists',
      });
      continue;
    }

    const manifestFile = `${targetFile}.manifest.json`;
    if (await pathExists(manifestFile)) {
      results.push({
        ...action,
        applied: false,
        refusal: 'target manifest already exists',
      });
      continue;
    }

    const sha256 = await sha256File(action.source_file);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.rename(action.source_file, targetFile);

    const manifest = {
      manifest_version: 1,
      action: action.action,
      task_id: action.task_id,
      project_id: action.project_id,
      original_path: action.source_file,
      target_path: targetFile,
      source_sha256: sha256,
      reason: action.reason,
      reviewed_at: '2026-05-29T12:13:00+02:00',
      moved_at: new Date().toISOString(),
      backup_preflight: backup,
    };
    await writeJson(manifestFile, manifest);

    results.push({
      ...action,
      dry_run: false,
      applied: true,
      target_file: targetFile,
      manifest_file: manifestFile,
      source_sha256: sha256,
    });
  }

  return {
    applied_count: results.filter((result) => result.applied).length,
    skipped_count: results.filter((result) => !result.applied).length,
    backup,
    results,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertApplyOptions(options);
  const { records, parse_errors } = await loadRecords();
  const historicalCollisions = await loadApprovedHistoricalCollisions();
  const filteredRecords = filterRecords(records, options);
  const filteredParseErrors = parse_errors.filter((error) => {
    if (options.projectId && !error.file.includes(`/${options.projectId}/`)) return false;
    return true;
  });
  const actions = buildPlan(
    filteredRecords,
    filteredParseErrors,
    historicalCollisions.approved,
    historicalCollisions.manifest_errors
  );
  const applyResult = options.apply ? await applyActions(actions, options) : null;
  const summary = {
    checked_at: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'dry-run',
    ok: !applyResult || applyResult.skipped_count === 0,
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    archive_tasks_dir: ARCHIVE_TASKS_DIR,
    workspace_archive_tasks_dir: WORKSPACE_ARCHIVE_TASKS_DIR,
    historical_collision_manifests_dir: HISTORICAL_COLLISION_MANIFESTS_DIR,
    quarantine_root: QUARANTINE_ROOT,
    runtime_backup_root: BACKUP_ROOT,
    runtime_backup_max_age_hours: BACKUP_MAX_AGE_HOURS,
    filters: {
      task_id: options.taskId,
      project_id: options.projectId,
      allow_reviewed: options.allowReviewed,
    },
    active_task_file_count: filteredRecords.filter((record) => record.scope === 'active').length,
    archived_task_file_count: filteredRecords.filter((record) => record.scope !== 'active').length,
    approved_historical_collision_count: historicalCollisions.manifests.filter((manifest) => manifest.ok).length,
    historical_collision_manifest_errors: historicalCollisions.manifest_errors,
    historical_collision_manifests: historicalCollisions.manifests,
    action_count: applyResult ? applyResult.results.length : actions.length,
    applied_count: applyResult?.applied_count || 0,
    skipped_count: applyResult?.skipped_count || 0,
    backup_preflight: applyResult?.backup || null,
    actions: applyResult ? applyResult.results : actions,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
