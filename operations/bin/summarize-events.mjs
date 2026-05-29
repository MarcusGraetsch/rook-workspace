#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');
const DISPATCHER_RUNTIME_DIR = process.env.ROOK_EVENT_DISPATCHER_RUNTIME_DIR || '/root/.openclaw/runtime/operations/events/dispatcher';
const QUEUES = ['inbox', 'outbox', 'archive', 'dead-letter', 'receipts'];
const PENDING_QUEUES = ['inbox', 'outbox'];
const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

async function walkJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const fileStat = await stat(fullPath).catch(() => null);
      files.push({
        path: fullPath,
        mtime_ms: fileStat?.mtimeMs || 0,
        size_bytes: fileStat?.size || 0,
      });
    }
  }
  return files;
}

async function summarizeQueue(eventsDir, queue) {
  const queuePath = path.join(eventsDir, queue);
  const files = await walkJsonFiles(queuePath);
  const latest = files.sort((a, b) => b.mtime_ms - a.mtime_ms)[0] || null;

  return {
    queue,
    path: queuePath,
    file_count: files.length,
    total_bytes: files.reduce((sum, file) => sum + file.size_bytes, 0),
    latest_file: latest?.path || null,
    latest_mtime: latest ? new Date(latest.mtime_ms).toISOString() : null,
  };
}

async function readJsonIfPossible(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function recentDeadLetters(eventsDir, limit) {
  const files = await walkJsonFiles(path.join(eventsDir, 'dead-letter'));
  const recent = files.sort((a, b) => b.mtime_ms - a.mtime_ms).slice(0, limit);
  return Promise.all(recent.map(async (file) => {
    const payload = await readJsonIfPossible(file.path);
    return {
      path: file.path,
      failed_at: payload?.failed_at || null,
      reason: payload?.reason || null,
      event_id: payload?.event?.event_id || null,
      idempotency_key: payload?.event?.idempotency_key || null,
      source_file: payload?.source_file || null,
      mtime: new Date(file.mtime_ms).toISOString(),
    };
  }));
}

async function recentReceipts(eventsDir, limit) {
  const files = await walkJsonFiles(path.join(eventsDir, 'receipts'));
  const recent = files.sort((a, b) => b.mtime_ms - a.mtime_ms).slice(0, limit);
  return Promise.all(recent.map(async (file) => {
    const payload = await readJsonIfPossible(file.path);
    return {
      path: file.path,
      receipt_id: payload?.receipt_id || null,
      event_id: payload?.event_id || null,
      acknowledged_by: payload?.acknowledged_by || null,
      state: payload?.state || null,
      acknowledged_at: payload?.acknowledged_at || null,
      mtime: new Date(file.mtime_ms).toISOString(),
    };
  }));
}

async function latestDispatcherRun(runStateDir) {
  const latestPath = path.join(runStateDir, 'latest.json');
  const payload = await readJsonIfPossible(latestPath);
  if (!payload) {
    return null;
  }

  return {
    ...payload,
    path: latestPath,
  };
}

function eventTiming(payload, file, nowMs) {
  const createdMs = Date.parse(payload?.created_at || '');
  const ttlHours = payload?.ttl_hours;
  const ttlMs = Number.isInteger(ttlHours) ? ttlHours * 60 * 60 * 1000 : NaN;
  const expiresMs = Number.isFinite(createdMs) && Number.isFinite(ttlMs) ? createdMs + ttlMs : NaN;
  const ageMs = Number.isFinite(createdMs) ? Math.max(0, nowMs - createdMs) : null;
  const expiresInMs = Number.isFinite(expiresMs) ? expiresMs - nowMs : null;

  return {
    path: file.path,
    queue: file.queue,
    event_id: payload?.event_id || null,
    message_id: payload?.message_id || null,
    idempotency_key: payload?.idempotency_key || null,
    created_at: payload?.created_at || null,
    ttl_hours: Number.isInteger(ttlHours) ? ttlHours : null,
    expires_at: Number.isFinite(expiresMs) ? new Date(expiresMs).toISOString() : null,
    age_hours: ageMs === null ? null : Number((ageMs / (60 * 60 * 1000)).toFixed(2)),
    expires_in_hours: expiresInMs === null ? null : Number((expiresInMs / (60 * 60 * 1000)).toFixed(2)),
    expired: expiresInMs !== null ? expiresInMs <= 0 : false,
    expiring_soon: expiresInMs !== null ? expiresInMs > 0 && expiresInMs <= EXPIRING_SOON_MS : false,
    invalid_timing: ageMs === null || expiresInMs === null,
  };
}

async function pendingDiagnostics(eventsDir) {
  const nowMs = Date.now();
  const files = [];
  for (const queue of PENDING_QUEUES) {
    const queueFiles = await walkJsonFiles(path.join(eventsDir, queue));
    files.push(...queueFiles.map((file) => ({ ...file, queue })));
  }

  const events = [];
  for (const file of files) {
    const payload = await readJsonIfPossible(file.path);
    events.push(eventTiming(payload, file, nowMs));
  }

  const withAge = events.filter((event) => typeof event.age_hours === 'number');
  const oldest = withAge.sort((a, b) => (b.age_hours || 0) - (a.age_hours || 0))[0] || null;
  const withExpiry = events.filter((event) => typeof event.expires_in_hours === 'number' && !event.expired);
  const nextExpiry = withExpiry.sort((a, b) => (a.expires_in_hours || 0) - (b.expires_in_hours || 0))[0] || null;

  return {
    expired_count: events.filter((event) => event.expired).length,
    expiring_soon_count: events.filter((event) => event.expiring_soon).length,
    invalid_timing_count: events.filter((event) => event.invalid_timing).length,
    oldest_pending_age_hours: oldest?.age_hours ?? null,
    oldest_pending_created_at: oldest?.created_at ?? null,
    oldest_pending_file: oldest?.path ?? null,
    next_expiry_at: nextExpiry?.expires_at ?? null,
    next_expiry_file: nextExpiry?.path ?? null,
    expiring_soon: events.filter((event) => event.expiring_soon).slice(0, 10),
    expired: events.filter((event) => event.expired).slice(0, 10),
  };
}

export async function getEventLedgerStatus(options = {}) {
  const eventsDir = options.eventsDir || EVENTS_DIR;
  const runStateDir = options.runStateDir || DISPATCHER_RUNTIME_DIR;
  const deadLetterLimit = Number.isInteger(options.deadLetterLimit) ? options.deadLetterLimit : 10;
  const receiptLimit = Number.isInteger(options.receiptLimit) ? options.receiptLimit : 10;
  const queues = await Promise.all(QUEUES.map((queue) => summarizeQueue(eventsDir, queue)));
  const queueMap = Object.fromEntries(queues.map((queue) => [queue.queue, queue]));

  return {
    ok: true,
    checked_at: new Date().toISOString(),
    events_dir: eventsDir,
    queues: queueMap,
    totals: {
      pending: (queueMap.inbox?.file_count || 0) + (queueMap.outbox?.file_count || 0),
      archived: queueMap.archive?.file_count || 0,
      dead_lettered: queueMap['dead-letter']?.file_count || 0,
      receipts: queueMap.receipts?.file_count || 0,
    },
    pending: await pendingDiagnostics(eventsDir),
    dispatcher: {
      runtime_dir: runStateDir,
      latest_run: await latestDispatcherRun(runStateDir),
    },
    recent_dead_letters: await recentDeadLetters(eventsDir, deadLetterLimit),
    recent_receipts: await recentReceipts(eventsDir, receiptLimit),
  };
}

async function main() {
  const status = await getEventLedgerStatus();
  console.log(JSON.stringify(status, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`SUMMARIZE_EVENTS_FAILED: ${error.message}`);
    process.exit(1);
  });
}
