#!/usr/bin/env node
/**
 * sync-github-issues.mjs
 *
 * Reads all canonical task JSONs that have a github_issue field and checks
 * the live GitHub state. When an issue has been closed or a PR has been
 * merged, the canonical task is updated to "done".
 *
 * Safe to run as a cron job — it never marks tasks as blocked, only "done".
 * All changes are written back to the canonical JSON file and logged.
 *
 * Usage:
 *   node sync-github-issues.mjs [--dry-run] [--project <project-id>]
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const TASKS_DIR = path.join('/root/.openclaw/workspace', 'operations', 'tasks');
const LOG_FILE = '/root/.openclaw/runtime/logs/sync-github-issues.jsonl';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_FILTER = (() => {
  const idx = process.argv.indexOf('--project');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(line);
  fs.appendFile(LOG_FILE, `${line}\n`, 'utf8').catch(() => {});
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function runGh(args, cwd = '/root/.openclaw/workspace') {
  return new Promise((resolve) => {
    const child = spawn('gh', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += String(d); });
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }));
    child.on('error', (e) => resolve({ code: 1, stdout: '', stderr: e.message }));
  });
}

// ---------------------------------------------------------------------------
// GitHub state fetch
// ---------------------------------------------------------------------------

async function fetchIssueState(repo, number) {
  const result = await runGh([
    'issue', 'view', String(number),
    '--repo', repo,
    '--json', 'state,title,closedAt',
  ]);
  if (result.code !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

async function fetchPRState(repo, number) {
  const result = await runGh([
    'pr', 'view', String(number),
    '--repo', repo,
    '--json', 'state,title,mergedAt,closedAt,url',
  ]);
  if (result.code !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

async function closeGitHubIssue(repo, number) {
  const result = await runGh(['issue', 'close', String(number), '--repo', repo]);
  return result.code === 0;
}

// ---------------------------------------------------------------------------
// Task file scanner
// ---------------------------------------------------------------------------

async function* walkTaskFiles(tasksDir, projectFilter) {
  const projectDirs = await fs.readdir(tasksDir).catch(() => []);
  for (const projectId of projectDirs) {
    if (projectFilter && projectId !== projectFilter) continue;
    const projectPath = path.join(tasksDir, projectId);
    const stat = await fs.stat(projectPath).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const files = await fs.readdir(projectPath).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      yield { filePath: path.join(projectPath, file), projectId };
    }
  }
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function syncTask(filePath) {
  let task;
  try {
    task = await readJson(filePath);
  } catch {
    return { action: 'skip', reason: 'unreadable' };
  }

  const ghIssue = task.github_issue;
  const ghPR = task.github_pull_request;

  if (!ghIssue?.repo && !ghPR?.repo) {
    return { action: 'skip', reason: 'no_github_link' };
  }

  // Rückfluss: wenn Task bereits done, linked Issue aber noch open → Issue schließen
  if (['done', 'archived'].includes(task.status)) {
    if (ghIssue?.repo && ghIssue?.number && ghIssue?.state === 'open') {
      log({
        action: 'close_issue_for_done_task',
        task_id: task.task_id,
        repo: ghIssue.repo,
        issue: ghIssue.number,
        dry_run: DRY_RUN,
      });
      if (!DRY_RUN) {
        const closed = await closeGitHubIssue(ghIssue.repo, ghIssue.number);
        if (closed) {
          return { action: 'issue_closed', reason: `task already done, closed issue #${ghIssue.number}` };
        }
      }
    }
    return { action: 'skip', reason: 'already_terminal' };
  }

  const nowIso = new Date().toISOString();
  let changed = false;
  let doneReason = null;

  // Check PR state first (more authoritative than issue for code tasks)
  if (ghPR?.repo && ghPR?.number) {
    const prState = await fetchPRState(ghPR.repo, ghPR.number);
    if (prState) {
      const canonicalState = prState.state?.toLowerCase();
      if (task.github_pull_request.state !== canonicalState) {
        task.github_pull_request.state = canonicalState;
        task.github_pull_request.sync_status = 'synced';
        task.github_pull_request.last_synced_at = nowIso;
        changed = true;
      }
      if (canonicalState === 'merged') {
        doneReason = `PR #${ghPR.number} merged`;
      } else if (canonicalState === 'closed') {
        // Closed but not merged — don't auto-done, just sync state
      }
    }
  }

  // Check issue state
  if (ghIssue?.repo && ghIssue?.number) {
    const issueState = await fetchIssueState(ghIssue.repo, ghIssue.number);
    if (issueState) {
      const canonicalState = issueState.state?.toLowerCase();
      if (task.github_issue.state !== canonicalState) {
        task.github_issue.state = canonicalState;
        task.github_issue.sync_status = 'synced';
        task.github_issue.last_synced_at = nowIso;
        changed = true;
      }
      if (canonicalState === 'closed' && !doneReason) {
        doneReason = `GitHub issue #${ghIssue.number} closed`;
      }
    }
  }

  if (doneReason && task.status !== 'done') {
    task.status = 'done';
    task.claimed_by = null;
    task.blocked_by = [];
    task.failure_reason = null;
    task.timestamps = task.timestamps || {};
    task.timestamps.updated_at = nowIso;
    task.timestamps.completed_at = task.timestamps.completed_at || nowIso;
    changed = true;
    log({
      action: 'task_done_via_github',
      task_id: task.task_id,
      project_id: task.project_id,
      reason: doneReason,
      dry_run: DRY_RUN,
    });
  }

  if (changed && !DRY_RUN) {
    await writeJson(filePath, task);
    return { action: doneReason ? 'marked_done' : 'state_synced', reason: doneReason };
  }

  return { action: changed ? 'would_change' : 'no_change' };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  await ensureDir(path.dirname(LOG_FILE));

  log({
    action: 'sync_start',
    dry_run: DRY_RUN,
    project_filter: PROJECT_FILTER || 'all',
  });

  let total = 0;
  let synced = 0;
  let done = 0;
  let closed = 0;
  let skipped = 0;
  let errors = 0;

  for await (const { filePath, projectId } of walkTaskFiles(TASKS_DIR, PROJECT_FILTER)) {
    total += 1;
    try {
      const result = await syncTask(filePath);
      if (result.action === 'skip') skipped += 1;
      else if (result.action === 'marked_done') { done += 1; synced += 1; }
      else if (result.action === 'state_synced') synced += 1;
      else if (result.action === 'issue_closed') closed += 1;
    } catch (err) {
      errors += 1;
      log({ action: 'task_error', file: filePath, error: err.message });
    }
  }

  log({
    action: 'sync_complete',
    total,
    synced,
    done,
    closed,
    skipped,
    errors,
    dry_run: DRY_RUN,
  });

  console.error(`sync-github-issues: ${total} tasks checked, ${done} marked done, ${closed} issues closed, ${synced - done} state-synced, ${errors} errors`);
}

main().catch((err) => {
  console.error(`sync-github-issues fatal: ${err.message}`);
  process.exit(1);
});
