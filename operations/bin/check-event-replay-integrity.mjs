#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SCHEMA, readJson, validateEvent } from './validate-event.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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

async function readRawJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return { raw, json: JSON.parse(raw) };
}

function receiptFieldsMatch(receipt, event) {
  const fields = ['event_type', 'correlation_id', 'idempotency_key', 'source_system', 'target_system', 'classification'];
  return fields
    .filter((field) => receipt[field] !== event[field])
    .map((field) => ({
      field,
      receipt_value: receipt[field] ?? null,
      event_value: event[field] ?? null,
    }));
}

export async function checkEventReplayIntegrity(options = {}) {
  const eventsDir = options.eventsDir || EVENTS_DIR;
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  const findings = [];
  const archiveFiles = await walkJsonFiles(path.join(eventsDir, 'archive'));
  const receiptFiles = await walkJsonFiles(path.join(eventsDir, 'receipts'));
  const archiveByEventId = new Map();

  for (const file of archiveFiles) {
    try {
      const { raw, json } = await readRawJson(file);
      validateEvent(schema, json);
      if (archiveByEventId.has(json.event_id)) {
        findings.push({
          severity: 'error',
          type: 'duplicate_archive_event_id',
          event_id: json.event_id,
          files: [archiveByEventId.get(json.event_id).file, file],
        });
      }
      archiveByEventId.set(json.event_id, {
        file,
        raw,
        event: json,
        digest: sha256(raw),
      });
    } catch (error) {
      findings.push({
        severity: 'error',
        type: 'invalid_archive_event',
        file,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const file of receiptFiles) {
    let receipt;
    try {
      receipt = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      findings.push({
        severity: 'error',
        type: 'invalid_receipt_json',
        file,
        details: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const eventId = receipt?.event_id;
    const archived = typeof eventId === 'string' ? archiveByEventId.get(eventId) : null;
    if (!archived) {
      findings.push({
        severity: 'error',
        type: 'receipt_event_missing',
        file,
        event_id: eventId || null,
      });
      continue;
    }

    if (receipt.event_digest_sha256 !== archived.digest) {
      findings.push({
        severity: 'error',
        type: 'receipt_event_digest_mismatch',
        file,
        event_id: eventId,
        receipt_digest_sha256: receipt.event_digest_sha256 || null,
        archive_digest_sha256: archived.digest,
        archive_file: archived.file,
      });
    }

    const mismatches = receiptFieldsMatch(receipt, archived.event);
    if (mismatches.length > 0) {
      findings.push({
        severity: 'error',
        type: 'receipt_event_metadata_mismatch',
        file,
        event_id: eventId,
        archive_file: archived.file,
        mismatches,
      });
    }
  }

  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  return {
    ok: errorCount === 0,
    checked_at: new Date().toISOString(),
    events_dir: eventsDir,
    archive_event_count: archiveFiles.length,
    receipt_count: receiptFiles.length,
    warning_count: warningCount,
    error_count: errorCount,
    findings,
  };
}

async function main() {
  const summary = await checkEventReplayIntegrity();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.ok ? 0 : 1;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'check-event-replay-integrity.mjs') {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
