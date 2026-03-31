#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const ROOT_DIR = '/root/.openclaw';
const HEALTH_FILE = path.join(ROOT_DIR, 'workspace', 'operations', 'health', 'runtime-smoke.json');
const ENV_DIR = path.join(ROOT_DIR, '.env.d');
const PROVIDER_ENV_FILES = [
  path.join(ENV_DIR, 'minimax-api-key.txt'),
  path.join(ENV_DIR, 'kimi-api-key.txt'),
];
const TIMEOUT_SECONDS = Number(process.env.ROOK_RUNTIME_SMOKE_TIMEOUT_SECONDS || '20');
const GRACE_MS = 5_000;
const AGENTS = ['engineer', 'researcher', 'test', 'review'];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function loadProviderEnv() {
  const loaded = {};
  for (const filePath of PROVIDER_ENV_FILES) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index <= 0) continue;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        if (key && value) {
          loaded[key] = value;
        }
      }
    } catch {
      // Missing env files should not crash the smoke check.
    }
  }
  return loaded;
}

async function runProbe(agentId) {
  const providerEnv = await loadProviderEnv();
  const token = `${agentId.toUpperCase()}_OK`;
  const sessionId = randomUUID();
  const childEnv = {
    ...process.env,
    ...providerEnv,
    ROOK_AGENT_ID: agentId,
    ROOK_AGENT_SESSION_ID: sessionId,
    ROOK_AGENT_MESSAGE: `Reply with exactly ${token} and nothing else.`,
    ROOK_AGENT_TIMEOUT: String(TIMEOUT_SECONDS),
  };
  const command = [
    'exec openclaw agent --local',
    '--agent "$ROOK_AGENT_ID"',
    '--session-id "$ROOK_AGENT_SESSION_ID"',
    '--message "$ROOK_AGENT_MESSAGE"',
    '--timeout "$ROOK_AGENT_TIMEOUT"',
    '--json',
  ].join(' ');

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn('bash', ['-lc', command], {
      cwd: ROOT_DIR,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let hardKill = null;
    const settle = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      if (hardKill) clearTimeout(hardKill);
      resolve(payload);
    };
    const killer = setTimeout(() => {
      stderr += `\nRuntime smoke timeout after ${TIMEOUT_SECONDS}s; sent SIGTERM.`;
      child.kill('SIGTERM');
      hardKill = setTimeout(() => {
        stderr += `\nRuntime smoke hard-killed child after ${GRACE_MS}ms grace period.`;
        child.kill('SIGKILL');
      }, GRACE_MS);
    }, TIMEOUT_SECONDS * 1000);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      settle({
        agent_id: agentId,
        ok: false,
        reason: `spawn error: ${error.message}`,
        code: 1,
        duration_ms: Date.now() - startedAt,
        stdout: stdout.trim().slice(-1000),
        stderr: stderr.trim().slice(-1000),
      });
    });
    child.on('close', (code) => {
      const trimmed = stdout.trim();
      const ok = code === 0 && trimmed.includes(token);
      settle({
        agent_id: agentId,
        ok,
        reason: ok ? null : (stderr.trim() || trimmed || `openclaw exited with ${code ?? 1}`).slice(-1000),
        code: code ?? 1,
        duration_ms: Date.now() - startedAt,
        stdout: trimmed.slice(-1000),
        stderr: stderr.trim().slice(-1000),
      });
    });
  });
}

async function main() {
  const results = [];
  for (const agentId of AGENTS) {
    results.push(await runProbe(agentId));
  }

  const payload = {
    updated_at: new Date().toISOString(),
    timeout_seconds: TIMEOUT_SECONDS,
    ok: results.every((entry) => entry.ok),
    results,
  };

  await ensureDir(path.dirname(HEALTH_FILE));
  await fs.writeFile(HEALTH_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  if (!payload.ok) {
    process.exitCode = 1;
  }
}

await main();
