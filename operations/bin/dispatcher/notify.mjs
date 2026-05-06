import { spawn } from 'child_process';
import { ALERTS_FILE, LOG_DIR_PATH, ensureDir } from './loader.mjs';
import { promises as fs } from 'fs';

// ---------------------------------------------------------------------------
// Constants (from original)
// ---------------------------------------------------------------------------
const NOTIFY_TIMEOUT_SECONDS = Number(process.env.ROOK_NOTIFY_TIMEOUT_SECONDS || '15');
const NOTIFY_MAX_ATTEMPTS = Number(process.env.ROOK_NOTIFY_MAX_ATTEMPTS || '3');
const NOTIFY_RETRY_DELAY_MS = Number(process.env.ROOK_NOTIFY_RETRY_DELAY_MS || '3000');
const NOTIFY_CHANNEL = process.env.ROOK_NOTIFY_CHANNEL || 'discord';
const NOTIFY_TARGET = process.env.ROOK_NOTIFY_TARGET || 'channel:1487786269542056071';
const NOTIFY_ENABLED = process.env.ROOK_NOTIFY_ENABLED !== '0';
// Telegram mirror for critical events (blocked, stale, max-attempts, no-executor)
const NOTIFY_TELEGRAM_ENABLED = process.env.ROOK_NOTIFY_TELEGRAM_ENABLED === '1';
const NOTIFY_TELEGRAM_TARGET = process.env.ROOK_NOTIFY_TELEGRAM_TARGET || 'user:549758481';
const CRITICAL_EVENTS = new Set(['dispatch_blocked', 'max_attempts_exceeded', 'stale_claim_released', 'no_executor']);
const CHILD_GRACE_MS = 30_000;
const MAX_LOG_BYTES = 4000;

// ---------------------------------------------------------------------------
// Notification sending
// ---------------------------------------------------------------------------

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnNotification(channel, target, message) {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn('openclaw', [
      'message', 'send',
      '--channel', channel,
      '--target', target,
      '--message', message,
    ], {
      cwd: '/root/.openclaw',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeoutMs = NOTIFY_TIMEOUT_SECONDS * 1000;
    let hardKill = null;
    const settle = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      if (hardKill) clearTimeout(hardKill);
      resolve(payload);
    };
    const killer = setTimeout(() => {
      stderr += `\nnotification timeout after ${timeoutMs}ms. Sent SIGTERM to openclaw child.`;
      child.kill('SIGTERM');
      hardKill = setTimeout(() => {
        stderr += `\nnotification hard-killed child after additional ${CHILD_GRACE_MS}ms grace period.`;
        child.kill('SIGKILL');
      }, CHILD_GRACE_MS);
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      stderr += `\nNotification spawn error: ${error.message}`;
      settle({ code: 1, stdout, stderr });
    });
    child.on('close', (code) => {
      settle({ code: code ?? 1, stdout, stderr });
    });
  });
}

export async function sendNotification(message) {
  if (!NOTIFY_ENABLED || !message.trim()) {
    return { ok: true, skipped: true };
  }
  const result = await spawnNotification(NOTIFY_CHANNEL, NOTIFY_TARGET, message);
  return { ...result, ok: result.code === 0 };
}

export async function sendTelegramNotification(message) {
  if (!NOTIFY_TELEGRAM_ENABLED || !message.trim()) {
    return { ok: true, skipped: true };
  }
  // Strip Discord markdown bold (**) — Telegram uses the same syntax but
  // Telegram markdown is more strict; plain text is always safe.
  const plain = message.replace(/\*\*/g, '*');
  const result = await spawnNotification('telegram', NOTIFY_TELEGRAM_TARGET, plain);
  return { ...result, ok: result.code === 0 };
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export function truncate(value, limit = MAX_LOG_BYTES) {
  return String(value || '').trim().slice(0, limit);
}

export async function appendLog(entry) {
  await ensureDir(LOG_DIR_PATH);
  const filePath = `${LOG_DIR_PATH}/${new Date().toLocaleDateString('sv')}.jsonl`;
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export async function appendAlert(entry) {
  await ensureDir((await import('path')).default.dirname(ALERTS_FILE));
  let existing = { updated_at: null, alerts: [] };
  try {
    existing = JSON.parse(await fs.readFile(ALERTS_FILE, 'utf8'));
  } catch {
    // Start a new alert file if it does not exist or is malformed.
  }

  const alerts = Array.isArray(existing.alerts) ? existing.alerts : [];
  alerts.push(entry);
  while (alerts.length > 50) {
    alerts.shift();
  }

  existing.updated_at = new Date().toISOString();
  existing.alerts = alerts;
  await writeJson(ALERTS_FILE, existing);
}

import { writeJson } from './loader.mjs';

// ---------------------------------------------------------------------------
// Notification + recording combined
// ---------------------------------------------------------------------------

export async function notifyAndRecord(task, event, message) {
  let lastNotification = { ok: true, skipped: true, attempts: 0, stdout: '', stderr: '', code: 0 };

  if (NOTIFY_ENABLED && message.trim()) {
    for (let attempt = 1; attempt <= NOTIFY_MAX_ATTEMPTS; attempt += 1) {
      const result = await sendNotification(message);
      lastNotification = {
        ...result,
        attempts: attempt,
        ok: result.code === 0 || result.skipped === true,
      };
      if (lastNotification.ok) {
        break;
      }
      if (attempt < NOTIFY_MAX_ATTEMPTS) {
        await sleep(NOTIFY_RETRY_DELAY_MS);
      }
    }
  }

  // Mirror critical events to Telegram (fire-and-forget, never blocks the main flow)
  if (CRITICAL_EVENTS.has(event) && message.trim()) {
    sendTelegramNotification(message).catch(() => {});
  }

  const alert = {
    ts: new Date().toISOString(),
    task_id: task.task_id,
    event,
    assigned_agent: task.assigned_agent,
    claimed_by: task.claimed_by,
    status: task.status,
    message: truncate(message),
    notify_ok: lastNotification.ok,
    notify_attempts: lastNotification.attempts,
    notify_code: lastNotification.code ?? 0,
    notify_stdout: truncate(lastNotification.stdout),
    notify_stderr: truncate(lastNotification.stderr),
  };

  await appendAlert(alert);
  await appendLog({
    ...alert,
    action: 'dispatch_notification',
  });

  return lastNotification;
}

// ---------------------------------------------------------------------------
// Lifecycle message formatting
// ---------------------------------------------------------------------------

const EVENT_EMOJI = {
  dispatch_started: '▶',
  worker_completed: '✅',
  dispatch_blocked: '🚫',
  stale_claim_released: '♻',
  no_executor: '⚠',
  max_attempts_exceeded: '🔴',
  pr_opened: '🔀',
  pr_merged: '🎉',
  task_done: '✔',
};

export function formatLifecycleMessage(task, event, extra = {}) {
  const executor = extra.executor || task.dispatch?.executor || task.claimed_by || task.assigned_agent;
  const emoji = EVENT_EMOJI[event] || '•';
  const title = task.title ? ` "${task.title}"` : '';
  const header = `${emoji} **${task.task_id}**${title}`;
  const lines = [header];

  if (event === 'dispatch_started') {
    lines.push(`Started by ${executor}`);
  } else if (event === 'worker_completed') {
    const statusLabel = task.status === 'done' ? '✔ done' : task.status;
    lines.push(`Completed by ${executor} — ${statusLabel}`);
  } else if (event === 'stale_claim_released') {
    lines.push(`Stale claim released`);
    if (task.failure_reason) lines.push(task.failure_reason.slice(0, 200));
  } else if (event === 'dispatch_blocked') {
    lines.push(`Blocked: ${(task.failure_reason || extra.reason || 'unknown reason').slice(0, 200)}`);
  } else if (event === 'no_executor') {
    lines.push(`No executor mapping — manual assignment required`);
  } else if (event === 'max_attempts_exceeded') {
    lines.push(`Max dispatch attempts exceeded — manual intervention required`);
  } else if (event === 'pr_opened') {
    const prNum = extra.prNumber || task.github_pull_request?.number;
    const prUrl = extra.prUrl || task.github_pull_request?.url || '';
    lines.push(`PR #${prNum} opened${prUrl ? `: ${prUrl}` : ''}`);
  } else if (event === 'pr_merged') {
    const prNum = extra.prNumber || task.github_pull_request?.number;
    lines.push(`PR #${prNum} merged — task done`);
  } else if (event === 'task_done') {
    lines.push(`Marked done${extra.reason ? `: ${extra.reason}` : ''}`);
  }

  if (task.branch && !['pr_opened', 'pr_merged', 'task_done'].includes(event)) {
    lines.push(`Branch: \`${task.branch}\``);
  }
  if (task.github_pull_request?.number && !['pr_opened', 'pr_merged'].includes(event)) {
    lines.push(`PR: #${task.github_pull_request.number}`);
  }

  return lines.join('\n');
}
