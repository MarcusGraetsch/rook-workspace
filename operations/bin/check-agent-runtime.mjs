#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const ROOT_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(ROOT_DIR, 'openclaw.json');
const HEALTH_FILE = path.join(ROOT_DIR, 'workspace', 'operations', 'health', 'runtime-smoke.json');
const GATEWAY_BASE_URL = process.env.ROOK_GATEWAY_BASE_URL || 'http://127.0.0.1:18789';
const HOOK_POLL_INTERVAL_MS = Number(process.env.ROOK_HOOK_POLL_INTERVAL_MS || '1000');
const HOOK_MODEL = process.env.ROOK_HOOK_MODEL || 'minimax-portal/MiniMax-M2.5';
const HOOK_THINKING = process.env.ROOK_HOOK_THINKING || 'low';
const TIMEOUT_SECONDS = Number(process.env.ROOK_RUNTIME_SMOKE_TIMEOUT_SECONDS || '20');
const AGENTS = ['engineer', 'researcher', 'test', 'review'];
let hookConfigPromise = null;

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadHookConfig() {
  if (!hookConfigPromise) {
    hookConfigPromise = (async () => {
      const config = await readJson(OPENCLAW_CONFIG_PATH);
      const hooks = config?.hooks;
      if (!hooks?.enabled || !hooks?.token) {
        throw new Error('OpenClaw hooks are not fully configured.');
      }
      const hookPath = String(hooks.path || '/hooks').replace(/\/+$/, '');
      return {
        token: String(hooks.token),
        agentUrl: `${GATEWAY_BASE_URL}${hookPath}/agent`,
      };
    })();
  }

  return hookConfigPromise;
}

async function readHookTranscriptState(agentId, sessionKey) {
  const sessionsDir = path.join(ROOT_DIR, 'agents', agentId, 'sessions');
  const indexPath = path.join(sessionsDir, 'sessions.json');
  let index = null;
  try {
    index = await readJson(indexPath);
  } catch {
    return null;
  }

  const entry = index?.[`agent:${agentId}:${sessionKey}`];
  const sessionId = entry?.sessionId;
  if (!sessionId) {
    return null;
  }

  const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
  let raw = '';
  try {
    raw = await fs.readFile(transcriptPath, 'utf8');
  } catch {
    return { sessionId, events: [] };
  }

  const events = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Ignore partial trailing writes.
    }
  }

  return { sessionId, events };
}

function flattenAssistantText(event) {
  const content = Array.isArray(event?.message?.content) ? event.message.content : [];
  return content
    .filter((entry) => entry?.type === 'text')
    .map((entry) => entry.text)
    .join('\n')
    .trim();
}

function findTerminalState(state) {
  const events = Array.isArray(state?.events) ? state.events : [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === 'custom' && event?.customType === 'openclaw:prompt-error') {
      return {
        ok: false,
        reason: event?.data?.error || 'prompt-error',
        sessionId: state?.sessionId || null,
        assistantText: '',
      };
    }
    if (event?.type === 'message' && event?.message?.role === 'assistant') {
      const stopReason = event?.message?.stopReason || null;
      const assistantText = flattenAssistantText(event);
      if (stopReason === 'stop') {
        return {
          ok: true,
          reason: null,
          sessionId: state?.sessionId || null,
          assistantText,
        };
      }
      if (stopReason === 'aborted' || stopReason === 'error') {
        return {
          ok: false,
          reason: event?.message?.errorMessage || `assistant ${stopReason}`,
          sessionId: state?.sessionId || null,
          assistantText,
        };
      }
    }
  }

  return null;
}

async function runProbe(agentId) {
  const token = `${agentId.toUpperCase()}_OK`;
  const hookConfig = await loadHookConfig();
  const startedAt = Date.now();
  const sessionKey = `hook:smoke:${agentId}:${randomUUID().slice(0, 8)}`;

  let response;
  try {
    response = await fetch(hookConfig.agentUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hookConfig.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Reply with exactly ${token} and nothing else.`,
        name: 'Runtime Smoke',
        agentId,
        sessionKey,
        wakeMode: 'now',
        deliver: false,
        model: HOOK_MODEL,
        thinking: HOOK_THINKING,
        timeoutSeconds: TIMEOUT_SECONDS,
      }),
    });
  } catch (error) {
    return {
      agent_id: agentId,
      ok: false,
      reason: `hook request failed: ${error instanceof Error ? error.message : String(error)}`,
      code: 1,
      duration_ms: Date.now() - startedAt,
      stdout: '',
      stderr: '',
    };
  }

  const bodyText = await response.text();
  if (!response.ok) {
    return {
      agent_id: agentId,
      ok: false,
      reason: `hook request returned HTTP ${response.status}`,
      code: response.status,
      duration_ms: Date.now() - startedAt,
      stdout: bodyText.slice(-1000),
      stderr: '',
    };
  }

  const deadline = Date.now() + TIMEOUT_SECONDS * 1000;
  while (Date.now() <= deadline) {
    const state = await readHookTranscriptState(agentId, sessionKey);
    const terminal = findTerminalState(state);
    if (terminal) {
      const ok = terminal.ok && terminal.assistantText.includes(token);
      return {
        agent_id: agentId,
        ok,
        reason: ok ? null : (terminal.reason || 'unexpected hook response'),
        code: ok ? 0 : 1,
        duration_ms: Date.now() - startedAt,
        stdout: terminal.assistantText.slice(-1000),
        stderr: bodyText.slice(-1000),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, HOOK_POLL_INTERVAL_MS));
  }

  return {
    agent_id: agentId,
    ok: false,
    reason: `hook smoke timed out after ${TIMEOUT_SECONDS}s`,
    code: 124,
    duration_ms: Date.now() - startedAt,
    stdout: '',
    stderr: bodyText.slice(-1000),
  };
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
