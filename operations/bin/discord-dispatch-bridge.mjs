#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT_DIR = '/root/.openclaw';
const WORKSPACE_DIR = path.join(ROOT_DIR, 'workspace');
const OPERATIONS_DIR = path.join(WORKSPACE_DIR, 'operations');
const HEALTH_DIR = path.join(OPERATIONS_DIR, 'health');
const STATE_FILE = path.join(HEALTH_DIR, 'discord-dispatch-state.json');
const WRAPPER_PATH = path.join(OPERATIONS_DIR, 'bin', 'dispatch-canonical-task.mjs');
const COMMAND_CHANNEL_ID = '1487786269542056071';
const COMMAND_GUILD_ID = '1487760796141359276';
const SESSION_DIRS = [
  path.join(ROOT_DIR, 'agents', 'dispatcher', 'sessions'),
  path.join(ROOT_DIR, 'agents', 'rook', 'sessions'),
];
const MAX_SCANNED_FILES = 12;
const MAX_PROCESSED_IDS = 500;
const VALID_TASK_ID = /\b([a-z0-9]+-\d{4,})\b/i;
const DISPATCH_TRIGGER = /(?:^|\s)(?:\/dispatch\b|dispatch(?:\s+canonical\s+task)?\b)/i;

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function flattenContent(event) {
  const content = Array.isArray(event?.message?.content) ? event.message.content : [];
  return content
    .filter((entry) => entry?.type === 'text')
    .map((entry) => String(entry.text || ''))
    .join('\n');
}

function extractMetadata(raw) {
  const messageId = raw.match(/"message_id"\s*:\s*"([^"]+)"/)?.[1] || null;
  const groupChannel = raw.match(/"group_channel"\s*:\s*"([^"]+)"/)?.[1] || null;
  const groupSpace = raw.match(/"group_space"\s*:\s*"([^"]+)"/)?.[1] || null;
  return { messageId, groupChannel, groupSpace };
}

function extractCommandText(raw) {
  let text = String(raw || '');
  const untrustedIndex = text.indexOf('Untrusted context');
  if (untrustedIndex >= 0) text = text.slice(0, untrustedIndex);
  text = text.replace(/Conversation info \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '');
  text = text.replace(/Sender \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '');
  return text.trim();
}

function parseDispatchRequest(event) {
  if (event?.type !== 'message' || event?.message?.role !== 'user') return null;
  const raw = flattenContent(event);
  if (!raw) return null;
  const metadata = extractMetadata(raw);
  const commandText = extractCommandText(raw);
  if (!metadata.messageId || !commandText) return null;
  if (metadata.groupChannel !== '#agent-commands') return null;
  if (metadata.groupSpace && metadata.groupSpace !== COMMAND_GUILD_ID) return null;
  if (!DISPATCH_TRIGGER.test(commandText)) return null;
  const taskId = commandText.match(VALID_TASK_ID)?.[1] || null;
  if (!taskId) return null;
  return {
    messageId: metadata.messageId,
    taskId: taskId.toLowerCase(),
    commandText,
  };
}

async function listRecentTranscriptFiles(dirPath) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const filePath = path.join(dirPath, entry.name);
    try {
      const stat = await fs.stat(filePath);
      files.push({ filePath, mtimeMs: stat.mtimeMs });
    } catch {
      // Ignore disappearing files.
    }
  }
  return files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, MAX_SCANNED_FILES)
    .map((entry) => entry.filePath);
}

async function collectRequests() {
  const requests = [];
  for (const dirPath of SESSION_DIRS) {
    for (const filePath of await listRecentTranscriptFiles(dirPath)) {
      let raw = '';
      try {
        raw = await fs.readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          const request = parseDispatchRequest(event);
          if (request) requests.push({ ...request, filePath });
        } catch {
          // Ignore malformed lines.
        }
      }
    }
  }
  const deduped = new Map();
  for (const request of requests) {
    if (!deduped.has(request.messageId)) deduped.set(request.messageId, request);
  }
  return Array.from(deduped.values()).sort((a, b) => a.messageId.localeCompare(b.messageId));
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT_DIR, env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function buildAckMessage(taskId, payload) {
  const after = payload?.after || {};
  if (payload?.accepted) {
    return [
      `[dispatcher][task:${taskId}] accepted`,
      `status: ${after.status || 'unknown'}`,
      `claimed_by: ${after.claimed_by || 'none'}`,
      `assigned_agent: ${after.assigned_agent || 'unknown'}`,
    ].join('\n');
  }
  return [
    `[dispatcher][task:${taskId}] not accepted`,
    `status: ${after.status || 'unknown'}`,
    `claimed_by: ${after.claimed_by || 'none'}`,
    `reason: ${after.failure_reason || payload?.dispatch?.stderr || payload?.dispatch?.stdout || 'dispatcher made no claim change'}`,
  ].join('\n');
}

async function sendDiscordAck(message) {
  return runCommand('openclaw', [
    'message',
    'send',
    '--channel',
    'discord',
    '--target',
    `channel:${COMMAND_CHANNEL_ID}`,
    '--message',
    message,
  ]);
}

async function dispatchTask(taskId) {
  const result = await runCommand('node', [WRAPPER_PATH, taskId]);
  let payload = null;
  try {
    payload = JSON.parse(result.stdout || '{}');
  } catch {
    payload = {
      ok: result.ok,
      accepted: false,
      task_id: taskId,
      after: {
        status: 'unknown',
        claimed_by: null,
        assigned_agent: null,
        failure_reason: result.stderr || result.stdout || 'wrapper output was not valid JSON',
      },
      dispatch: {
        ok: result.ok,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    };
  }
  return { result, payload };
}

async function main() {
  const state = await readJson(STATE_FILE, {
    processed_message_ids: [],
    processed: [],
    updated_at: null,
  });
  const processedIds = new Set(Array.isArray(state.processed_message_ids) ? state.processed_message_ids : []);
  const requests = await collectRequests();
  const handled = Array.isArray(state.processed) ? state.processed.slice(-MAX_PROCESSED_IDS) : [];

  for (const request of requests) {
    if (processedIds.has(request.messageId)) continue;
    const { payload } = await dispatchTask(request.taskId);
    const ack = buildAckMessage(request.taskId, payload);
    const delivery = await sendDiscordAck(ack);
    processedIds.add(request.messageId);
    handled.push({
      message_id: request.messageId,
      task_id: request.taskId,
      accepted: Boolean(payload?.accepted),
      status: payload?.after?.status || null,
      claimed_by: payload?.after?.claimed_by || null,
      delivery_ok: delivery.ok,
      delivery_error: delivery.ok ? null : (delivery.stderr || delivery.stdout || 'message send failed'),
      handled_at: new Date().toISOString(),
    });
  }

  const nextState = {
    processed_message_ids: Array.from(processedIds).slice(-MAX_PROCESSED_IDS),
    processed: handled.slice(-MAX_PROCESSED_IDS),
    updated_at: new Date().toISOString(),
  };
  await writeJson(STATE_FILE, nextState);
}

main().catch(async (error) => {
  const state = await readJson(STATE_FILE, {
    processed_message_ids: [],
    processed: [],
  });
  const nextState = {
    ...state,
    updated_at: new Date().toISOString(),
    last_error: error instanceof Error ? error.message : String(error),
  };
  await writeJson(STATE_FILE, nextState);
  process.exit(1);
});
