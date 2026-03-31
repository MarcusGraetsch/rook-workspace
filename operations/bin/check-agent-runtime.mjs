#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT_DIR = '/root/.openclaw';
const HEALTH_FILE = path.join(ROOT_DIR, 'workspace', 'operations', 'health', 'runtime-smoke.json');
const TIMEOUT_SECONDS = Number(process.env.ROOK_RUNTIME_SMOKE_TIMEOUT_SECONDS || '20');
const GRACE_MS = 5_000;
const AGENTS = ['engineer', 'researcher', 'test', 'review'];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function runProbe(agentId) {
  const token = `${agentId.toUpperCase()}_OK`;
  const args = [
    'agent',
    '--local',
    '--agent',
    agentId,
    '--message',
    `Reply with exactly ${token} and nothing else.`,
    '--timeout',
    String(TIMEOUT_SECONDS),
    '--json',
  ];

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn('openclaw', args, {
      cwd: ROOT_DIR,
      env: process.env,
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
