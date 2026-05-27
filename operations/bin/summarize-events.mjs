#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');
const QUEUES = ['inbox', 'outbox', 'archive', 'dead-letter'];

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

export async function getEventLedgerStatus(options = {}) {
  const eventsDir = options.eventsDir || EVENTS_DIR;
  const deadLetterLimit = Number.isInteger(options.deadLetterLimit) ? options.deadLetterLimit : 10;
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
    },
    recent_dead_letters: await recentDeadLetters(eventsDir, deadLetterLimit),
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
