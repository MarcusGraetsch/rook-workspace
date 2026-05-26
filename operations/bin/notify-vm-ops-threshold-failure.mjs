#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const OPENCLAW_ROOT = '/root/.openclaw';
const WORKSPACE_ROOT = path.join(OPENCLAW_ROOT, 'workspace');
const OPS_ROOT = path.join(WORKSPACE_ROOT, 'operations');
const THRESHOLD_SCRIPT = path.join(OPS_ROOT, 'bin', 'check-vm-ops-baseline-thresholds.mjs');
const NOTIFY_CONFIG_PATH = path.join(OPS_ROOT, 'config', 'vm-ops-notify.json');
const REPORT_DIR = path.join(OPENCLAW_ROOT, 'docs', 'reports');
const PENDING_LOG = path.join(OPS_ROOT, 'logs', 'vm-ops-notify-pending.jsonl');
const OPENCLAW_ENTRY = '/usr/lib/node_modules/openclaw/dist/index.js';

function nowStamp() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}_${pad(now.getUTCHours())}-${pad(now.getUTCMinutes())}-${pad(now.getUTCSeconds())}Z`;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function runThreshold() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vm-ops-threshold-'));
  const outFile = path.join(tmpDir, 'threshold.json');
  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', `node '${THRESHOLD_SCRIPT}' > '${outFile}'`], {
      cwd: WORKSPACE_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('close', async (code) => {
      try {
        const raw = await fs.readFile(outFile, 'utf8');
        const json = JSON.parse(raw || '{}');
        resolve({ code: code ?? 1, json, stderr: stderr.trim() });
      } catch (error) {
        resolve({
          code: code ?? 1,
          json: { ok: false, fatal: `threshold output parse failed: ${error.message}` },
          stderr: stderr.trim(),
        });
      }
    });
  });
}

function summarizeFailures(result) {
  const failed = (result.checks || []).filter((c) => c.ok === false);
  if (failed.length === 0) {
    return 'unknown failure (no failed checks listed)';
  }
  return failed
    .map((c) => `${c.key}: actual=${JSON.stringify(c.actual)} expected=${JSON.stringify(c.expected)}`)
    .join('; ');
}

function clip(text, maxLen) {
  const s = String(text || '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 3)}...`;
}

async function sendOpenclawMessage(channel, target, message, dryRun = false) {
  return new Promise((resolve) => {
    const args = [
      OPENCLAW_ENTRY,
      'message', 'send',
      '--channel', channel,
      '--target', target,
      '--message', message,
    ];
    if (dryRun) {
      args.push('--dry-run');
      args.push('--json');
    }

    const child = spawn('/usr/bin/node', args, {
      cwd: OPENCLAW_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += String(d); });
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('error', (error) => {
      resolve({ ok: false, code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      resolve({ ok: (code ?? 1) === 0, code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function appendPending(entry) {
  await fs.mkdir(path.dirname(PENDING_LOG), { recursive: true });
  await fs.appendFile(PENDING_LOG, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function writeFailureReport(thresholdResult, message, delivery) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const filePath = path.join(REPORT_DIR, `${nowStamp()}_session-review_vm-ops-threshold-alert.md`);
  const lines = [
    '# VM Ops Threshold Alert',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    '## Lagebild',
    '- Daily threshold gate detected a failure condition.',
    '',
    '## Failed Checks',
    ...((thresholdResult.checks || []).filter((c) => c.ok === false).map((c) => `- ${c.key}: actual=${JSON.stringify(c.actual)} expected=${JSON.stringify(c.expected)} (${c.reason || 'no reason'})`)),
    '',
    '## Notification Delivery',
    `- primary_ok: ${delivery.primary.ok}`,
    `- primary_code: ${delivery.primary.code}`,
    `- telegram_ok: ${delivery.telegram.ok}`,
    `- telegram_code: ${delivery.telegram.code}`,
    '',
    '## Message',
    '```text',
    message,
    '```',
    '',
  ];
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
  return filePath;
}

async function main() {
  const cfg = await readJson(NOTIFY_CONFIG_PATH, {
    enabled: true,
    channel: 'discord',
    target: 'channel:1487786269542056071',
    telegram_enabled: true,
    telegram_target: 'user:549758481',
    max_message_length: 1800,
    dry_run: false,
  });

  const run = await runThreshold();
  const threshold = run.json || {};
  if (threshold.ok === true && run.code === 0) {
    process.stdout.write(JSON.stringify({
      ts: new Date().toISOString(),
      ok: true,
      action: 'no_alert_needed',
    }, null, 2) + '\n');
    return;
  }

  const summary = summarizeFailures(threshold);
  const reportHint = `${OPENCLAW_ROOT}/docs/reports`;
  const msg = clip(
    `VM OPS ALERT: threshold gate failed on ${new Date().toISOString()}. ${summary}. dirty_repos=${threshold.dirty_repo_count ?? 'n/a'}. See reports in ${reportHint}.`,
    Number(cfg.max_message_length || 1800),
  );

  let primary = { ok: false, code: 1, stdout: '', stderr: 'notification disabled' };
  let telegram = { ok: false, code: 1, stdout: '', stderr: 'telegram disabled' };

  if (cfg.enabled) {
    primary = await sendOpenclawMessage(cfg.channel, cfg.target, msg, cfg.dry_run === true);
  }
  if (cfg.telegram_enabled) {
    telegram = await sendOpenclawMessage('telegram', cfg.telegram_target, msg, cfg.dry_run === true);
  }

  const reportPath = await writeFailureReport(threshold, msg, { primary, telegram });

  const anyDelivered = primary.ok || (cfg.telegram_enabled && telegram.ok);

  if (!anyDelivered) {
    await appendPending({
      ts: new Date().toISOString(),
      type: 'vm_ops_threshold_alert',
      message: msg,
      primary,
      telegram,
      report_path: reportPath,
      threshold_ok: threshold.ok === true,
    });
  }

  const output = {
    ts: new Date().toISOString(),
    ok: anyDelivered,
    threshold_ok: threshold.ok === true,
    report_path: reportPath,
    primary,
    telegram,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exit(output.ok ? 0 : 2);
}

main().catch((error) => {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(),
    ok: false,
    fatal: String(error?.message || error),
  }, null, 2) + '\n');
  process.exit(2);
});
