#!/usr/bin/env node
/**
 * watchdog.mjs
 *
 * Agent Liveness Watchdog — checks health snapshots and runtime task heartbeats,
 * sends Telegram alerts when agents stall or smoke tests go stale.
 *
 * Usage:
 *   node watchdog.mjs             # run one check cycle
 *   node watchdog.mjs --dry-run   # check without sending alerts
 *
 * Designed to be called from cron every 2 minutes:
 *   * /2 * * * * node /root/.openclaw/workspace/operations/bin/watchdog.mjs
 */

import { promises as fs } from 'fs';
import { createRequire } from 'module';
import https from 'https';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG  = path.join(OPENCLAW_DIR, 'openclaw.json');
const HEALTH_DIR       = path.join(OPENCLAW_DIR, 'workspace/operations/health');
const RUNTIME_DIR      = path.join(OPENCLAW_DIR, 'runtime/operations/task-state');
const SMOKE_FILE       = path.join(HEALTH_DIR, 'runtime-smoke.json');
const COOLDOWN_FILE    = path.join(HEALTH_DIR, 'watchdog-cooldown.json');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Config ──────────────────────────────────────────────────────────────────

async function loadConfig() {
  const raw = JSON.parse(await fs.readFile(OPENCLAW_CONFIG, 'utf8'));
  const watchdog = raw.watchdog ?? {};
  const telegram = raw.channels?.telegram ?? {};
  return {
    thresholdMinutes: watchdog.thresholdMinutes ?? 30,
    cooldownMinutes:  watchdog.cooldownMinutes  ?? 30,
    telegramChatId:   watchdog.telegramChatId   ?? telegram.allowFrom?.[0],
    botToken:         telegram.botToken,
  };
}

// ─── Cooldown ─────────────────────────────────────────────────────────────────

async function loadCooldown() {
  try {
    return JSON.parse(await fs.readFile(COOLDOWN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveCooldown(state) {
  await fs.writeFile(COOLDOWN_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function isCoolingDown(cooldown, key, cooldownMs) {
  const last = cooldown[key];
  return last && (Date.now() - last) < cooldownMs;
}

// ─── Telegram ─────────────────────────────────────────────────────────────────

function telegramRequest(botToken, chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendAlert(cfg, key, message) {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] Alert (${key}):\n${message}`);
    return;
  }
  if (!cfg.botToken || !cfg.telegramChatId) {
    console.error(`[watchdog] No Telegram credentials — cannot send alert for ${key}`);
    return;
  }
  try {
    await telegramRequest(cfg.botToken, cfg.telegramChatId, message);
    console.log(`[watchdog] Alert sent: ${key}`);
  } catch (err) {
    console.error(`[watchdog] Telegram send failed: ${err.message}`);
  }
}

// ─── Checks ───────────────────────────────────────────────────────────────────

async function checkSmokeTest(cfg, cooldown) {
  const alerts = [];
  let smoke;

  try {
    smoke = JSON.parse(await fs.readFile(SMOKE_FILE, 'utf8'));
  } catch {
    // Smoke file missing — skip silently; may not have run yet
    return alerts;
  }

  const thresholdMs  = cfg.thresholdMinutes * 60 * 1000;
  const cooldownMs   = cfg.cooldownMinutes  * 60 * 1000;
  const now          = Date.now();
  const updatedAt    = new Date(smoke.updated_at).getTime();
  const ageMinutes   = Math.round((now - updatedAt) / 60000);

  // Check 1: overall smoke test stale
  if ((now - updatedAt) > thresholdMs) {
    const key = 'smoke_stale';
    if (!isCoolingDown(cooldown, key, cooldownMs)) {
      alerts.push({
        key,
        message: `⚠️ *OpenClaw Watchdog* — Smoke test stale\n\nLast run: ${ageMinutes} min ago (threshold: ${cfg.thresholdMinutes} min)\n\nCheck cron or run: \`node workspace/operations/bin/check-openclaw-contract.mjs\``
      });
    }
  }

  // Check 2: individual agent failures in latest smoke run
  for (const result of smoke.results ?? []) {
    if (!result.ok) {
      const key = `agent_failed_${result.agent_id}`;
      if (!isCoolingDown(cooldown, key, cooldownMs)) {
        const reason = result.reason || result.stdout || result.stderr || '(no details)';
        alerts.push({
          key,
          message: `🔴 *OpenClaw Watchdog* — Agent failed\n\nAgent: \`${result.agent_id}\`\nReason: ${String(reason).slice(0, 200)}\n\nRescue: \`dispatch rescue ${result.agent_id}\``
        });
      }
    }
  }

  return alerts;
}

async function checkTaskHeartbeats(cfg, cooldown) {
  const alerts = [];
  const thresholdMs = cfg.thresholdMinutes * 60 * 1000;
  const cooldownMs  = cfg.cooldownMinutes  * 60 * 1000;
  const now         = Date.now();

  let projects;
  try {
    projects = await fs.readdir(RUNTIME_DIR);
  } catch {
    return alerts;
  }

  for (const project of projects) {
    const projectDir = path.join(RUNTIME_DIR, project);
    let files;
    try {
      files = await fs.readdir(projectDir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = JSON.parse(await fs.readFile(path.join(projectDir, file), 'utf8'));

        // Only check tasks that are actively in-progress and have a heartbeat
        if (raw.status !== 'in-progress' || !raw.last_heartbeat) continue;

        const lastBeat = new Date(raw.last_heartbeat).getTime();
        const ageMinutes = Math.round((now - lastBeat) / 60000);

        if ((now - lastBeat) > thresholdMs) {
          const key = `task_stall_${raw.task_id}`;
          if (!isCoolingDown(cooldown, key, cooldownMs)) {
            const agent = raw.assigned_agent || '(unknown)';
            alerts.push({
              key,
              message: `⚠️ *OpenClaw Watchdog* — Task stalled\n\nTask: \`${raw.task_id}\` — ${raw.title || ''}\nAgent: \`${agent}\`\nLast heartbeat: ${ageMinutes} min ago\n\nRescue: \`dispatch rescue ${raw.task_id}\``
            });
          }
        }
      } catch {
        // Malformed or locked file — skip
      }
    }
  }

  return alerts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cfg      = await loadConfig();
  const cooldown = await loadCooldown();

  const [smokeAlerts, heartbeatAlerts] = await Promise.all([
    checkSmokeTest(cfg, cooldown),
    checkTaskHeartbeats(cfg, cooldown),
  ]);

  const allAlerts = [...smokeAlerts, ...heartbeatAlerts];

  if (allAlerts.length === 0) {
    if (DRY_RUN) console.log('[watchdog] All clear — no alerts.');
    process.exit(0);
  }

  const now = Date.now();
  for (const alert of allAlerts) {
    await sendAlert(cfg, alert.key, alert.message);
    cooldown[alert.key] = now;
  }

  await saveCooldown(cooldown);
  process.exit(0);
}

main().catch(err => {
  console.error(`[watchdog] Fatal: ${err.message}`);
  process.exit(1);
});
