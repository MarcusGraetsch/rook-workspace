#!/usr/bin/env node
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { processQueue } from './process-events.mjs';
import { ackEvent } from './ack-event.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');
const RUNTIME_DIR = process.env.ROOK_EVENT_DISPATCHER_RUNTIME_DIR || '/root/.openclaw/runtime/operations/events/dispatcher';

function usage() {
  console.error([
    'Usage: dispatch-events.mjs [--queue inbox|outbox] [--dry-run] [--limit <n>]',
    '',
    'Valid events are archived, then a delivered receipt is written for each target system.',
    'Invalid or duplicate events are moved to dead-letter by process-events.mjs.',
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    queue: 'outbox',
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function compactTimestamp(value) {
  return value.replace(/[-:.]/g, '').replace('T', '_').replace('Z', 'Z');
}

async function writeRunMetadata({ summary, startedAt, finishedAt, runStateDir }) {
  const startedMs = Date.parse(startedAt);
  const finishedMs = Date.parse(finishedAt);
  const runId = `dispatch_${compactTimestamp(startedAt)}`;
  const deliveryStates = summary.deliveries.reduce((counts, delivery) => {
    counts[delivery.state] = (counts[delivery.state] || 0) + 1;
    return counts;
  }, {});
  const failures = summary.deliveries.filter((delivery) => (
    delivery.state === 'delivery-failed'
    || delivery.state === 'not-delivered'
    || typeof delivery.reason === 'string'
  ));
  const record = {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: Number.isFinite(startedMs) && Number.isFinite(finishedMs) ? Math.max(0, finishedMs - startedMs) : null,
    queue: summary.queue,
    dry_run: summary.dry_run,
    ok: summary.ok,
    checked: summary.processing.checked,
    archived: summary.processing.archived,
    dead_lettered: summary.processing.dead_lettered,
    delivered: summary.delivered,
    delivery_failures: summary.delivery_failures,
    delivery_states: deliveryStates,
    last_error: failures[0]?.reason || null,
    failures: failures.slice(0, 10),
  };

  const targetDir = runStateDir || RUNTIME_DIR;
  const latestPath = path.join(targetDir, 'latest.json');
  const historyPath = path.join(targetDir, `${startedAt.slice(0, 7)}.jsonl`);
  await mkdir(targetDir, { recursive: true, mode: 0o700 });
  await writeFile(latestPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  await appendFile(historyPath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  return { latest_path: latestPath, history_path: historyPath, record };
}

export async function dispatchQueue(options) {
  const startedAt = new Date().toISOString();
  const eventsDir = options.eventsDir || EVENTS_DIR;
  const processing = await processQueue({
    queue: options.queue || 'outbox',
    dryRun: options.dryRun || false,
    limit: options.limit || Infinity,
    eventsDir,
  });

  const deliveries = [];
  for (const result of processing.results) {
    if (result.state !== 'archived') {
      deliveries.push({
        event_file: result.file,
        state: 'not-delivered',
        reason: result.reason || result.state,
      });
      continue;
    }

    if (options.dryRun) {
      deliveries.push({
        event_file: result.file,
        archive_target: result.target,
        state: 'would-deliver',
      });
      continue;
    }

    try {
      const event = await readJson(result.target);
      const receipt = await ackEvent({
        eventFile: result.target,
        system: event.target_system,
        state: 'delivered',
        notes: `Dispatcher delivered ${event.event_id} from ${options.queue || 'outbox'} to ${event.target_system}.`,
        dryRun: false,
        eventsDir,
      });
      deliveries.push({
        event_id: event.event_id,
        event_file: result.target,
        target_system: event.target_system,
        state: receipt.duplicate ? 'already-delivered' : 'delivered',
        receipt_file: receipt.target,
      });
    } catch (error) {
      deliveries.push({
        event_file: result.target,
        state: 'delivery-failed',
        reason: error.message,
      });
    }
  }

  const deliveryFailures = deliveries.filter((delivery) => delivery.state === 'delivery-failed').length;
  const summary = {
    ok: processing.dead_lettered === 0 && deliveryFailures === 0,
    dry_run: options.dryRun || false,
    queue: options.queue || 'outbox',
    processing,
    delivered: deliveries.filter((delivery) => delivery.state === 'delivered' || delivery.state === 'already-delivered').length,
    delivery_failures: deliveryFailures,
    deliveries,
  };

  const finishedAt = new Date().toISOString();
  try {
    const metadata = await writeRunMetadata({
      summary,
      startedAt,
      finishedAt,
      runStateDir: options.runStateDir,
    });
    return {
      ...summary,
      run_metadata: {
        latest_path: metadata.latest_path,
        history_path: metadata.history_path,
        run_id: metadata.record.run_id,
      },
    };
  } catch (error) {
    return {
      ...summary,
      ok: false,
      run_metadata_error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await dispatchQueue(options);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`DISPATCH_EVENTS_FAILED: ${error.message}`);
    process.exit(1);
  });
}
