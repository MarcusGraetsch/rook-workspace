#!/usr/bin/env node
/**
 * github-webhook-handler.mjs
 *
 * HTTP server that receives GitHub webhooks and immediately updates
 * canonical task JSON files — eliminating the 24h polling lag from
 * sync-github-issues.mjs.
 *
 * Handles:
 *   pull_request: closed (merged or just closed)
 *   issues:       closed
 *
 * When a linked task is found and its state should change, it:
 *   1. Updates the canonical JSON (status → done if merged/closed)
 *   2. Sends a Discord + Telegram notification
 *
 * Setup options (pick one):
 *   A) smee.io  — easiest, no infra needed:
 *      npm install -g smee-client
 *      smee --url https://smee.io/YOUR_CHANNEL_ID --target http://localhost:9876/webhook
 *
 *   B) Tailscale — production, secure:
 *      Enable Tailscale in openclaw.json (tailscale.mode: "on")
 *      Expose port 9876 via Tailscale IP
 *
 * Environment variables:
 *   GITHUB_WEBHOOK_SECRET  — optional, validates X-Hub-Signature-256
 *   WEBHOOK_PORT           — default 9876
 *
 * Usage:
 *   node github-webhook-handler.mjs
 */

import http from 'http';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = Number(process.env.WEBHOOK_PORT || '9876');
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const TASKS_DIR = '/root/.openclaw/workspace/operations/tasks';
const LOG_FILE = '/root/.openclaw/runtime/logs/github-webhook.jsonl';
const OPENCLAW_DIR = '/root/.openclaw';
const NOTIFY_DISCORD_TARGET = process.env.ROOK_NOTIFY_TARGET || 'channel:1487786269542056071';
const NOTIFY_TELEGRAM_TARGET = process.env.ROOK_NOTIFY_TELEGRAM_TARGET || 'user:549758481';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function writeJson(p, data) {
  await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function log(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(line);
  fs.appendFile(LOG_FILE, `${line}\n`, 'utf8').catch(() => {});
}

function verifySignature(body, signature) {
  if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET;
  const expected = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function sendMessage(channel, target, message) {
  return new Promise((resolve) => {
    const child = spawn('openclaw', ['message', 'send', '--channel', channel, '--target', target, '--message', message], {
      cwd: OPENCLAW_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
    setTimeout(() => { child.kill(); resolve(false); }, 15000);
  });
}

// ---------------------------------------------------------------------------
// Task lookup
// ---------------------------------------------------------------------------

async function* walkTaskFiles() {
  const projectDirs = await fs.readdir(TASKS_DIR).catch(() => []);
  for (const projectId of projectDirs) {
    const projectPath = path.join(TASKS_DIR, projectId);
    const stat = await fs.stat(projectPath).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const files = await fs.readdir(projectPath).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      yield path.join(projectPath, file);
    }
  }
}

async function findTaskByRepo(repo, issueNumber, prNumber) {
  for await (const filePath of walkTaskFiles()) {
    let task;
    try { task = await readJson(filePath); } catch { continue; }
    if (!task.task_id) continue;

    const issueMatch = task.github_issue?.repo === repo && task.github_issue?.number === issueNumber;
    const prMatch = task.github_pull_request?.repo === repo && task.github_pull_request?.number === prNumber;

    if (issueMatch || prMatch) {
      return { filePath, task };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handlePullRequest(payload) {
  const { action, pull_request: pr, repository } = payload;
  if (!['closed'].includes(action)) return { handled: false, reason: `action=${action} not tracked` };

  const repo = repository.full_name;
  const prNumber = pr.number;
  const merged = pr.merged === true;

  log({ event: 'pull_request', action, repo, pr: prNumber, merged });

  const found = await findTaskByRepo(repo, null, prNumber);
  if (!found) return { handled: false, reason: `no task linked to ${repo}#${prNumber}` };

  const { filePath, task } = found;
  if (['done', 'archived'].includes(task.status) && task.github_pull_request?.state === (merged ? 'merged' : 'closed')) {
    return { handled: false, reason: 'already in sync' };
  }

  const nowIso = new Date().toISOString();
  if (task.github_pull_request) {
    task.github_pull_request.state = merged ? 'merged' : 'closed';
    task.github_pull_request.sync_status = 'synced';
    task.github_pull_request.last_synced_at = nowIso;
  }

  if (merged && task.status !== 'done') {
    task.status = 'done';
    task.claimed_by = null;
    task.blocked_by = [];
    task.failure_reason = null;
    task.timestamps = task.timestamps || {};
    task.timestamps.updated_at = nowIso;
    task.timestamps.completed_at = task.timestamps.completed_at || nowIso;
  }

  await writeJson(filePath, task);

  const msg = merged
    ? `🎉 **${task.task_id}** "${task.title ?? ''}" — PR #${prNumber} merged → done`
    : `🔀 **${task.task_id}** — PR #${prNumber} closed (unmerged)`;

  await sendMessage('discord', NOTIFY_DISCORD_TARGET, msg);
  if (merged) await sendMessage('telegram', NOTIFY_TELEGRAM_TARGET, msg.replace(/\*\*/g, '*'));

  log({ event: 'pull_request', action: merged ? 'task_done' : 'pr_closed', task_id: task.task_id, pr: prNumber });
  return { handled: true, task_id: task.task_id, status: task.status };
}

async function handleIssue(payload) {
  const { action, issue, repository } = payload;
  if (action !== 'closed') return { handled: false, reason: `action=${action} not tracked` };

  const repo = repository.full_name;
  const issueNumber = issue.number;

  log({ event: 'issues', action, repo, issue: issueNumber });

  const found = await findTaskByRepo(repo, issueNumber, null);
  if (!found) return { handled: false, reason: `no task linked to ${repo}#${issueNumber}` };

  const { filePath, task } = found;
  if (['done', 'archived'].includes(task.status) && task.github_issue?.state === 'closed') {
    return { handled: false, reason: 'already in sync' };
  }

  const nowIso = new Date().toISOString();
  if (task.github_issue) {
    task.github_issue.state = 'closed';
    task.github_issue.sync_status = 'synced';
    task.github_issue.last_synced_at = nowIso;
  }

  if (task.status !== 'done') {
    task.status = 'done';
    task.claimed_by = null;
    task.blocked_by = [];
    task.failure_reason = null;
    task.timestamps = task.timestamps || {};
    task.timestamps.updated_at = nowIso;
    task.timestamps.completed_at = task.timestamps.completed_at || nowIso;
  }

  await writeJson(filePath, task);

  const msg = `✔ **${task.task_id}** "${task.title ?? ''}" — Issue #${issueNumber} closed → done`;
  await sendMessage('discord', NOTIFY_DISCORD_TARGET, msg);
  await sendMessage('telegram', NOTIFY_TELEGRAM_TARGET, msg.replace(/\*\*/g, '*'));

  log({ event: 'issues', action: 'task_done', task_id: task.task_id, issue: issueNumber });
  return { handled: true, task_id: task.task_id, status: 'done' };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

async function handleRequest(req, res) {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(req.url === '/health' ? 200 : 404).end(req.url === '/health' ? 'OK' : 'Not Found');
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  if (!verifySignature(body, req.headers['x-hub-signature-256'])) {
    log({ event: 'auth_failed', ip: req.socket.remoteAddress });
    res.writeHead(401).end('Unauthorized');
    return;
  }

  const event = req.headers['x-github-event'];
  let payload;
  try { payload = JSON.parse(body.toString('utf8')); }
  catch { res.writeHead(400).end('Bad JSON'); return; }

  let result = { handled: false, reason: 'unknown event' };
  try {
    if (event === 'pull_request') result = await handlePullRequest(payload);
    else if (event === 'issues') result = await handleIssue(payload);
    else {
      log({ event, action: 'untracked' });
      result = { handled: false, reason: `event=${event} not tracked` };
    }
  } catch (err) {
    log({ event, error: err.message });
    result = { handled: false, error: err.message };
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}

async function main() {
  await ensureDir(path.dirname(LOG_FILE));
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      log({ event: 'server_error', error: err.message });
      res.writeHead(500).end('Internal Error');
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    log({ event: 'server_start', port: PORT, secret_set: Boolean(WEBHOOK_SECRET) });
    console.error(`[webhook] Listening on http://127.0.0.1:${PORT}/webhook`);
    console.error('[webhook] Health check: http://127.0.0.1:${PORT}/health');
  });
}

main().catch((err) => {
  console.error(`[webhook] Fatal: ${err.message}`);
  process.exit(1);
});
