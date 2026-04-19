#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const BACKUP_ROOT = '/root/backups/rook-runtime';
const EXPECTED_FILES = [
  'operations/tasks.tar.gz',
  'operations/runtime-state.tar.gz',
  'manifests/backup-manifest.txt',
  'manifests/git-heads.txt',
  'manifests/git-status.txt',
];

async function safeStat(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
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

async function main() {
  const backupDirs = await listBackupDirs(BACKUP_ROOT);
  const latestBackup = backupDirs.at(-1) || null;
  const checks = [];
  const issues = [];

  function addCheck(name, ok, details) {
    checks.push({ name, ok, details });
    if (!ok) {
      issues.push(`${name}: ${details}`);
    }
  }

  addCheck('backup_root_exists', backupDirs.length > 0, backupDirs.length > 0 ? BACKUP_ROOT : 'no local backups found');

  if (latestBackup) {
    for (const relativeFile of EXPECTED_FILES) {
      const targetPath = path.join(latestBackup, relativeFile);
      const stat = await safeStat(targetPath);
      addCheck(relativeFile, Boolean(stat?.isFile() && stat.size > 0), stat ? `${targetPath} (${stat.size} bytes)` : `${targetPath} missing`);
    }

    const dashboardDbPath = path.join(latestBackup, 'dashboard', 'kanban.db');
    const dashboardDbStat = await safeStat(dashboardDbPath);
    addCheck(
      'dashboard/kanban.db',
      Boolean(dashboardDbStat?.isFile() && dashboardDbStat.size > 0),
      dashboardDbStat ? `${dashboardDbPath} (${dashboardDbStat.size} bytes)` : `${dashboardDbPath} missing`
    );
  }

  const summary = {
    checked_at: new Date().toISOString(),
    backup_root: BACKUP_ROOT,
    latest_backup: latestBackup,
    ok: issues.length === 0,
    checks,
    issues,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
