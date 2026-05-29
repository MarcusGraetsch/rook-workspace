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
const RECEIPT_SCHEMA = path.join(OPERATIONS_DIR, 'schemas', 'rook-hermes-receipt.schema.json');
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

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

function normalizePathForCompare(filePath) {
  return path.resolve(String(filePath || ''));
}

function failReceipt(message) {
  throw new Error(message);
}

function allowedValues(schema, key) {
  const values = schema?.properties?.[key]?.enum;
  return Array.isArray(values) ? values : null;
}

function validateReceipt(schema, receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    failReceipt('receipt must be a JSON object');
  }

  for (const key of schema.required || []) {
    if (!(key in receipt)) {
      failReceipt(`missing required field: ${key}`);
    }
  }

  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties || {}));
    for (const key of Object.keys(receipt)) {
      if (!allowed.has(key)) {
        failReceipt(`unexpected top-level field: ${key}`);
      }
    }
  }

  for (const key of ['receipt_id', 'event_id', 'event_type', 'correlation_id', 'idempotency_key', 'source_system', 'target_system', 'acknowledged_by', 'state', 'acknowledged_at', 'event_file', 'event_digest_sha256', 'classification']) {
    if (typeof receipt[key] !== 'string' || receipt[key].trim().length === 0) {
      failReceipt(`${key} must be a non-empty string`);
    }
  }

  if (receipt.schema_version !== schema.properties.schema_version.const) {
    failReceipt(`schema_version must be ${schema.properties.schema_version.const}`);
  }

  for (const key of ['source_system', 'target_system', 'acknowledged_by', 'state', 'classification']) {
    const allowed = allowedValues(schema, key);
    if (allowed && !allowed.includes(receipt[key])) {
      failReceipt(`${key} must be one of: ${allowed.join(', ')}`);
    }
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(receipt.receipt_id)) {
    failReceipt('receipt_id must match ^[A-Za-z0-9][A-Za-z0-9._:-]*$');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(receipt.event_id)) {
    failReceipt('event_id must match ^[A-Za-z0-9][A-Za-z0-9._:-]*$');
  }
  if (!/^[a-z][a-z0-9._-]*$/.test(receipt.event_type)) {
    failReceipt('event_type must be lowercase and match ^[a-z][a-z0-9._-]*$');
  }
  if (!ISO_DATE_TIME.test(receipt.acknowledged_at)) {
    failReceipt('acknowledged_at must be an ISO-8601 UTC timestamp ending in Z');
  }
  if (!/^[a-f0-9]{64}$/.test(receipt.event_digest_sha256)) {
    failReceipt('event_digest_sha256 must be a lowercase SHA-256 hex digest');
  }
  if (receipt.notes !== null && typeof receipt.notes !== 'string') {
    failReceipt('notes must be a string or null');
  }
}

export async function checkEventReplayIntegrity(options = {}) {
  const eventsDir = options.eventsDir || EVENTS_DIR;
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  const receiptSchema = await readJson(RECEIPT_SCHEMA, 'receipt schema');
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
      validateReceipt(receiptSchema, receipt);
    } catch (error) {
      findings.push({
        severity: 'error',
        type: 'invalid_receipt',
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

    if (normalizePathForCompare(receipt.event_file) !== normalizePathForCompare(archived.file)) {
      findings.push({
        severity: 'warning',
        type: 'receipt_event_file_path_mismatch',
        file,
        event_id: eventId,
        receipt_event_file: receipt.event_file,
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
