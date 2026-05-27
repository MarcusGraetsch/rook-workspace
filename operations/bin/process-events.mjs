#!/usr/bin/env node
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SCHEMA, readJson, validateEvent } from './validate-event.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');
const ARCHIVE_DIR = path.join(EVENTS_DIR, 'archive');
const DEAD_LETTER_DIR = path.join(EVENTS_DIR, 'dead-letter');

function usage() {
  console.error('Usage: process-events.mjs [--queue inbox|outbox] [--dry-run] [--limit <n>]');
}

function parseArgs(argv) {
  const options = {
    queue: 'inbox',
    dryRun: false,
    limit: Infinity,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--queue') {
      options.queue = argv[++index];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--limit') {
      options.limit = Number(argv[++index]);
    } else {
      usage();
      process.exit(2);
    }
  }

  if (!['inbox', 'outbox'].includes(options.queue)) {
    usage();
    process.exit(2);
  }
  if (!Number.isFinite(options.limit) && options.limit !== Infinity) {
    usage();
    process.exit(2);
  }
  if (options.limit !== Infinity && (!Number.isInteger(options.limit) || options.limit < 1)) {
    usage();
    process.exit(2);
  }

  return options;
}

function monthPath(root, timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return path.join(root, 'undated');
  }
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return path.join(root, year, month);
}

function safeName(value) {
  return String(value || 'event')
    .replace(/[^A-Za-z0-9._:-]/g, '-')
    .slice(0, 180);
}

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

async function walkJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function loadSeenIdempotencyKeys() {
  const seen = new Map();
  for (const root of [ARCHIVE_DIR, DEAD_LETTER_DIR]) {
    for (const file of await walkJsonFiles(root)) {
      const raw = await readFile(file, 'utf8').catch(() => null);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const key = parsed.idempotency_key || parsed.event?.idempotency_key;
        if (typeof key === 'string' && key) {
          seen.set(key, file);
        }
      } catch {
        // Ignore malformed historical files; validators handle new queue entries.
      }
    }
  }
  return seen;
}

async function moveFile(source, target, dryRun) {
  if (dryRun) return;
  await mkdir(path.dirname(target), { recursive: true });
  await rename(source, target);
}

async function writeDeadLetter({ source, reason, event, raw, dryRun }) {
  const now = new Date().toISOString();
  const eventId = event?.event_id || path.basename(source, '.json');
  const targetDir = monthPath(DEAD_LETTER_DIR, event?.created_at || now);
  const target = path.join(targetDir, `${safeName(eventId)}.${Date.now()}.dead-letter.json`);
  const record = {
    failure_id: `dead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    failed_at: now,
    source_file: source,
    reason,
    event: event || null,
    raw: event ? undefined : raw,
  };

  if (!dryRun) {
    await mkdir(targetDir, { recursive: true });
    await writeFile(target, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    await rm(source, { force: true });
  }

  return target;
}

async function processFile({ file, schema, seen, dryRun }) {
  const raw = await readFile(file, 'utf8');
  let event;
  try {
    event = JSON.parse(raw);
    validateEvent(schema, event);
  } catch (error) {
    const target = await writeDeadLetter({
      source: file,
      reason: error.message,
      event,
      raw,
      dryRun,
    });
    return { file, state: 'dead-lettered', reason: error.message, target };
  }

  if (seen.has(event.idempotency_key)) {
    const reason = `duplicate idempotency_key already seen at ${seen.get(event.idempotency_key)}`;
    const target = await writeDeadLetter({ source: file, reason, event, raw, dryRun });
    return { file, state: 'dead-lettered', reason, target };
  }

  const targetDir = monthPath(ARCHIVE_DIR, event.created_at);
  const target = path.join(targetDir, `${safeName(event.event_id)}.json`);
  await moveFile(file, target, dryRun);
  seen.set(event.idempotency_key, target);
  return { file, state: 'archived', target };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const queueDir = path.join(EVENTS_DIR, options.queue);
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  const seen = await loadSeenIdempotencyKeys();
  const files = (await listJsonFiles(queueDir)).slice(0, options.limit);

  const results = [];
  for (const file of files) {
    results.push(await processFile({ file, schema, seen, dryRun: options.dryRun }));
  }

  const summary = {
    ok: results.every((result) => result.state === 'archived'),
    dry_run: options.dryRun,
    queue: options.queue,
    checked: files.length,
    archived: results.filter((result) => result.state === 'archived').length,
    dead_lettered: results.filter((result) => result.state === 'dead-lettered').length,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.dead_lettered > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`PROCESS_EVENTS_ERROR: ${error.message}`);
  process.exit(1);
});
