#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SCHEMA, readJson, validateEvent, ValidationError } from './validate-event.mjs';
import { processQueue } from './process-events.mjs';
import { emitTaskEvent } from './emit-task-event.mjs';
import { getEventLedgerStatus } from './summarize-events.mjs';
import { ackEvent } from './ack-event.mjs';
import { dispatchQueue } from './dispatch-events.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(OPERATIONS_DIR, 'tests', 'events', 'fixtures');
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function makeLedger() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rook-event-ledger-check-'));
  await Promise.all([
    mkdir(path.join(root, 'inbox'), { recursive: true }),
    mkdir(path.join(root, 'outbox'), { recursive: true }),
    mkdir(path.join(root, 'archive'), { recursive: true }),
    mkdir(path.join(root, 'dead-letter'), { recursive: true }),
    mkdir(path.join(root, 'receipts'), { recursive: true }),
  ]);
  return root;
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function validateFixtures(schema) {
  const valid = await readJsonFile(path.join(FIXTURES_DIR, 'valid-event.json'));
  validateEvent(schema, valid);

  const invalid = await readJsonFile(path.join(FIXTURES_DIR, 'invalid-missing-idempotency.json'));
  let failed = false;
  try {
    validateEvent(schema, invalid);
  } catch (error) {
    failed = error instanceof ValidationError && error.message.includes('idempotency_key');
  }
  assert(failed, 'invalid fixture should fail because idempotency_key is missing');
}

async function checkArchiveAndDeadLetter() {
  const ledger = await makeLedger();
  try {
    await cp(path.join(FIXTURES_DIR, 'valid-event.json'), path.join(ledger, 'inbox', 'valid-event.json'));
    await cp(
      path.join(FIXTURES_DIR, 'invalid-missing-idempotency.json'),
      path.join(ledger, 'inbox', 'invalid-missing-idempotency.json'),
    );

    const summary = await processQueue({
      queue: 'inbox',
      dryRun: false,
      limit: Infinity,
      eventsDir: ledger,
    });
    assert(summary.ok === false, 'mixed valid/invalid processing should not be ok');
    assert(summary.checked === 2, 'processor should check two events');
    assert(summary.archived === 1, 'processor should archive one valid event');
    assert(summary.dead_lettered === 1, 'processor should dead-letter one invalid event');

    const archived = path.join(ledger, 'archive', '2026', '05', 'evt_20260527_fixture_valid_0001.json');
    const archivedEvent = await readJsonFile(archived);
    assert(archivedEvent.event_id === 'evt_20260527_fixture_valid_0001', 'archived event should match fixture');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function checkDuplicateIdempotency() {
  const ledger = await makeLedger();
  try {
    const archiveDir = path.join(ledger, 'archive', '2026', '05');
    await mkdir(archiveDir, { recursive: true });
    await cp(
      path.join(FIXTURES_DIR, 'valid-event.json'),
      path.join(archiveDir, 'evt_20260527_fixture_valid_0001.json'),
    );
    await cp(path.join(FIXTURES_DIR, 'duplicate-event.json'), path.join(ledger, 'inbox', 'duplicate-event.json'));

    const summary = await processQueue({
      queue: 'inbox',
      dryRun: false,
      limit: Infinity,
      eventsDir: ledger,
    });
    assert(summary.ok === false, 'duplicate processing should not be ok');
    assert(summary.checked === 1, 'duplicate check should process one queued event');
    assert(summary.archived === 0, 'duplicate event should not be archived');
    assert(summary.dead_lettered === 1, 'duplicate event should be dead-lettered');
    assert(summary.results[0].reason.includes('duplicate idempotency_key'), 'duplicate reason should mention idempotency');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function checkExpiredTtlDeadLetter() {
  const ledger = await makeLedger();
  try {
    await cp(path.join(FIXTURES_DIR, 'expired-event.json'), path.join(ledger, 'inbox', 'expired-event.json'));

    const summary = await processQueue({
      queue: 'inbox',
      dryRun: false,
      limit: Infinity,
      eventsDir: ledger,
    });
    assert(summary.ok === false, 'expired event processing should not be ok');
    assert(summary.checked === 1, 'expired check should process one queued event');
    assert(summary.archived === 0, 'expired event should not be archived');
    assert(summary.dead_lettered === 1, 'expired event should be dead-lettered');
    assert(summary.results[0].reason.includes('event TTL expired'), 'expired reason should mention TTL');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function checkTaskEventProducer(schema) {
  const ledger = await makeLedger();
  try {
    const result = await emitTaskEvent({
      taskId: 'ops-0049',
      statusBefore: 'review',
      statusAfter: 'done',
      target: 'hermes',
      eventType: 'task_state.changed',
      classification: 'bridge-safe',
      ttlHours: 168,
      summary: 'Synthetic producer regression check.',
      dryRun: false,
      eventsDir: ledger,
    });
    validateEvent(schema, result.event);
    const written = await readJsonFile(result.target);
    assert(written.event_id === result.event.event_id, 'producer should write event to outbox');
    assert(written.payload.summary === 'Synthetic producer regression check.', 'producer should preserve summary');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function checkEventSummary() {
  const ledger = await makeLedger();
  try {
    await cp(path.join(FIXTURES_DIR, 'valid-event.json'), path.join(ledger, 'inbox', 'valid-event.json'));
    await cp(path.join(FIXTURES_DIR, 'duplicate-event.json'), path.join(ledger, 'outbox', 'duplicate-event.json'));
    const status = await getEventLedgerStatus({ eventsDir: ledger, deadLetterLimit: 5 });
    assert(status.ok === true, 'event summary should be ok');
    assert(status.queues.inbox.file_count === 1, 'event summary should count inbox files');
    assert(status.queues.outbox.file_count === 1, 'event summary should count outbox files');
    assert(status.totals.pending === 2, 'event summary should count pending files');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function checkReceiptWriter() {
  const ledger = await makeLedger();
  try {
    const eventFile = path.join(ledger, 'archive', 'valid-event.json');
    await cp(path.join(FIXTURES_DIR, 'valid-event.json'), eventFile);
    const result = await ackEvent({
      eventFile,
      system: 'hermes',
      state: 'acked',
      notes: 'Synthetic receipt regression check.',
      dryRun: false,
      eventsDir: ledger,
    });
    assert(result.ok === true, 'receipt writer should return ok');
    assert(result.duplicate === false, 'first receipt write should not be duplicate');
    const written = await readJsonFile(result.target);
    assert(written.event_id === 'evt_20260527_fixture_valid_0001', 'receipt should reference fixture event');
    assert(written.acknowledged_by === 'hermes', 'receipt should record acknowledging system');

    const duplicate = await ackEvent({
      eventFile,
      system: 'hermes',
      state: 'acked',
      notes: 'Synthetic receipt regression check.',
      dryRun: false,
      eventsDir: ledger,
    });
    assert(duplicate.duplicate === true, 'second identical receipt should be idempotent');

    const status = await getEventLedgerStatus({ eventsDir: ledger, receiptLimit: 5 });
    assert(status.totals.receipts === 1, 'event summary should count receipts');
    assert(status.recent_receipts[0].event_id === 'evt_20260527_fixture_valid_0001', 'event summary should include recent receipt');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function checkDispatcher() {
  const ledger = await makeLedger();
  try {
    await cp(path.join(FIXTURES_DIR, 'valid-event.json'), path.join(ledger, 'outbox', 'valid-event.json'));
    const summary = await dispatchQueue({
      queue: 'outbox',
      dryRun: false,
      limit: Infinity,
      eventsDir: ledger,
    });

    assert(summary.ok === true, 'dispatcher should return ok for valid outbox event');
    assert(summary.processing.archived === 1, 'dispatcher should archive one event');
    assert(summary.delivered === 1, 'dispatcher should write one delivered receipt');
    assert(summary.deliveries[0].target_system === 'hermes', 'dispatcher should deliver to fixture target system');

    const status = await getEventLedgerStatus({ eventsDir: ledger, receiptLimit: 5 });
    assert(status.totals.pending === 0, 'dispatcher should drain pending outbox event');
    assert(status.totals.archived === 1, 'dispatcher should leave one archived event');
    assert(status.totals.receipts === 1, 'dispatcher should leave one receipt');
    assert(status.recent_receipts[0].state === 'delivered', 'dispatcher receipt should be delivered state');
  } finally {
    await rm(ledger, { recursive: true, force: true });
  }
}

async function main() {
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  await validateFixtures(schema);
  await checkArchiveAndDeadLetter();
  await checkDuplicateIdempotency();
  await checkExpiredTtlDeadLetter();
  await checkTaskEventProducer(schema);
  await checkEventSummary();
  await checkReceiptWriter();
  await checkDispatcher();
  console.log(JSON.stringify({
    ok: true,
    checked: [
      'valid fixture validation',
      'invalid fixture rejection',
      'archive movement',
      'dead-letter movement',
      'duplicate idempotency rejection',
      'expired TTL dead-letter path',
      'task event producer outbox write',
      'event ledger status summary',
      'event receipt writer',
      'event dispatcher delivered receipt',
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(`EVENT_LEDGER_CHECK_FAILED: ${error.stack || error.message}`);
  process.exit(1);
});
