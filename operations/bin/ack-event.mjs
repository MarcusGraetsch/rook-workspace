#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_SCHEMA, readJson, validateEvent } from './validate-event.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');
const EVENT_SEARCH_QUEUES = ['archive', 'inbox', 'outbox'];
const SYSTEMS = ['rook', 'hermes', 'openclaw', 'dashboard', 'n8n', 'gitlab'];
const STATES = ['delivered', 'acked', 'failed'];

function usage() {
  console.error([
    'Usage: ack-event.mjs (--event-id <id> | --event-file <path>) --system <system> [options]',
    '',
    'Options:',
    '  --state <state>       delivered|acked|failed, default: acked',
    '  --notes <text>        Optional operator or consumer note',
    '  --dry-run             Print receipt without writing it',
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    eventId: null,
    eventFile: null,
    system: null,
    state: 'acked',
    notes: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--event-id') {
      options.eventId = argv[++index];
    } else if (arg === '--event-file') {
      options.eventFile = argv[++index];
    } else if (arg === '--system') {
      options.system = argv[++index];
    } else if (arg === '--state') {
      options.state = argv[++index];
    } else if (arg === '--notes') {
      options.notes = argv[++index];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      usage();
      process.exit(2);
    }
  }

  if ((!options.eventId && !options.eventFile) || (options.eventId && options.eventFile)) {
    usage();
    process.exit(2);
  }
  if (!SYSTEMS.includes(options.system)) {
    usage();
    process.exit(2);
  }
  if (!STATES.includes(options.state)) {
    usage();
    process.exit(2);
  }

  return options;
}

function safeName(value) {
  return String(value || 'event')
    .replace(/[^A-Za-z0-9._:-]/g, '-')
    .slice(0, 180);
}

function monthPath(root, timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return path.join(root, 'undated');
  }
  return path.join(root, String(date.getUTCFullYear()), String(date.getUTCMonth() + 1).padStart(2, '0'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

async function loadEventFromFile(eventFile) {
  const raw = await readFile(eventFile, 'utf8');
  return {
    event: JSON.parse(raw),
    raw,
    eventFile,
  };
}

async function findEventById(eventsDir, eventId) {
  for (const queue of EVENT_SEARCH_QUEUES) {
    for (const file of await walkJsonFiles(path.join(eventsDir, queue))) {
      const loaded = await loadEventFromFile(file).catch(() => null);
      if (loaded?.event?.event_id === eventId) {
        return loaded;
      }
    }
  }
  throw new Error(`event not found in ${EVENT_SEARCH_QUEUES.join(', ')}: ${eventId}`);
}

function buildReceipt({ event, raw, eventFile, options, now }) {
  const acknowledgedAt = now.toISOString();
  const eventDigest = sha256(raw);
  const receiptId = [
    'receipt',
    safeName(event.event_id),
    safeName(options.system),
    safeName(options.state),
    eventDigest.slice(0, 16),
  ].join('_');

  return {
    receipt_id: receiptId,
    schema_version: 'rook-hermes-receipt.v1',
    event_id: event.event_id,
    event_type: event.event_type,
    correlation_id: event.correlation_id,
    idempotency_key: event.idempotency_key,
    source_system: event.source_system,
    target_system: event.target_system,
    acknowledged_by: options.system,
    state: options.state,
    acknowledged_at: acknowledgedAt,
    event_file: eventFile,
    event_digest_sha256: eventDigest,
    classification: event.classification,
    notes: options.notes || null,
  };
}

export async function ackEvent(options) {
  const eventsDir = options.eventsDir || EVENTS_DIR;
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  const loaded = options.eventFile
    ? await loadEventFromFile(options.eventFile)
    : await findEventById(eventsDir, options.eventId);

  validateEvent(schema, loaded.event);
  const receipt = buildReceipt({ ...loaded, options, now: new Date() });
  const targetDir = monthPath(path.join(eventsDir, 'receipts'), receipt.acknowledged_at);
  const target = path.join(targetDir, `${safeName(receipt.receipt_id)}.json`);

  if (!options.dryRun) {
    await mkdir(targetDir, { recursive: true });
    if (await pathExists(target)) {
      return {
        ok: true,
        duplicate: true,
        target,
        receipt,
      };
    }
    await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  }

  return {
    ok: true,
    duplicate: false,
    target,
    receipt,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await ackEvent(options);
  console.log(JSON.stringify({
    ok: result.ok,
    dry_run: options.dryRun,
    duplicate: result.duplicate,
    target: result.target,
    receipt: result.receipt,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`ACK_EVENT_FAILED: ${error.message}`);
    process.exit(1);
  });
}
