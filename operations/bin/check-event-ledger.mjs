#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SCHEMA, readJson, validateEvent, ValidationError } from './validate-event.mjs';
import { processQueue } from './process-events.mjs';

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

async function main() {
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  await validateFixtures(schema);
  await checkArchiveAndDeadLetter();
  await checkDuplicateIdempotency();
  console.log(JSON.stringify({
    ok: true,
    checked: [
      'valid fixture validation',
      'invalid fixture rejection',
      'archive movement',
      'dead-letter movement',
      'duplicate idempotency rejection',
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(`EVENT_LEDGER_CHECK_FAILED: ${error.stack || error.message}`);
  process.exit(1);
});
