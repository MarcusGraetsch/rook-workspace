#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_SCHEMA = path.resolve(__dirname, '../schemas/rook-hermes-event.schema.json');

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function invalid(message) {
  throw new ValidationError(message);
}

export function fail(message) {
  console.error(`INVALID: ${message}`);
  process.exit(1);
}

export async function readJson(filePath, label) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    invalid(`${label} not readable: ${filePath}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    invalid(`${label} is not valid JSON: ${error.message}`);
  }
}

function ensureObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalid(`${label} must be a JSON object`);
  }
}

function allowedValues(schema, key) {
  const values = schema?.properties?.[key]?.enum;
  return Array.isArray(values) ? values : null;
}

function requiredFields(schema) {
  return Array.isArray(schema?.required) ? schema.required : [];
}

function validateEnum(schema, event, key) {
  const allowed = allowedValues(schema, key);
  if (allowed && !allowed.includes(event[key])) {
    invalid(`${key} must be one of: ${allowed.join(', ')}`);
  }
}

function validateNoAdditionalProperties(schema, event) {
  if (schema.additionalProperties !== false) return;
  const allowed = new Set(Object.keys(schema.properties || {}));
  for (const key of Object.keys(event)) {
    if (!allowed.has(key)) {
      invalid(`unexpected top-level field: ${key}`);
    }
  }
}

function validateRequiredString(event, key) {
  if (typeof event[key] !== 'string' || event[key].trim().length === 0) {
    invalid(`${key} must be a non-empty string`);
  }
}

export function validateEvent(schema, event) {
  ensureObject(schema, 'schema');
  ensureObject(event, 'event');

  for (const key of requiredFields(schema)) {
    if (!(key in event)) {
      invalid(`missing required field: ${key}`);
    }
  }

  for (const key of ['event_id', 'message_id', 'correlation_id', 'idempotency_key', 'classification']) {
    validateRequiredString(event, key);
  }

  validateNoAdditionalProperties(schema, event);

  for (const key of ['schema_version', 'source_system', 'target_system', 'classification']) {
    validateEnum(schema, event, key);
  }

  if (event.source_system === event.target_system) {
    invalid('source_system and target_system must differ');
  }

  if (event.message_id !== event.event_id) {
    invalid('message_id must match event_id for event-ledger messages');
  }

  if (typeof event.event_type !== 'string' || !/^[a-z][a-z0-9._-]*$/.test(event.event_type)) {
    invalid('event_type must be lowercase and match ^[a-z][a-z0-9._-]*$');
  }

  if (typeof event.created_at !== 'string' || !ISO_DATE_TIME.test(event.created_at)) {
    invalid('created_at must be an ISO-8601 UTC timestamp ending in Z');
  }

  if (!Number.isInteger(event.ttl_hours) || event.ttl_hours < 1 || event.ttl_hours > 720) {
    invalid('ttl_hours must be an integer between 1 and 720');
  }

  ensureObject(event.payload, 'payload');

  if ('acks' in event) {
    if (!Array.isArray(event.acks)) {
      invalid('acks must be an array when present');
    }
    for (const [index, ack] of event.acks.entries()) {
      ensureObject(ack, `acks[${index}]`);
      validateEnum({ properties: { system: schema.properties.acks.items.properties.system } }, ack, 'system');
      if (typeof ack.acknowledged_at !== 'string' || !ISO_DATE_TIME.test(ack.acknowledged_at)) {
        invalid(`acks[${index}].acknowledged_at must be an ISO-8601 UTC timestamp ending in Z`);
      }
      for (const key of Object.keys(ack)) {
        if (!['system', 'acknowledged_at', 'notes'].includes(key)) {
          invalid(`unexpected acks[${index}] field: ${key}`);
        }
      }
    }
  }

  if ('delivery' in event) {
    ensureObject(event.delivery, 'delivery');
    if (typeof event.delivery.state !== 'string') {
      invalid('delivery.state must be a string');
    }
    if (!Number.isInteger(event.delivery.attempts) || event.delivery.attempts < 0) {
      invalid('delivery.attempts must be a non-negative integer');
    }
    validateEnum({ properties: { state: schema.properties.delivery.properties.state } }, event.delivery, 'state');
  }
}

function usage() {
  console.error('Usage: validate-event.mjs [--schema <schema-file>] <event-json-file>');
}

export async function main() {
  const args = process.argv.slice(2);
  let schemaPath = DEFAULT_SCHEMA;

  if (args[0] === '--schema') {
    if (!args[1]) {
      usage();
      process.exit(2);
    }
    schemaPath = path.resolve(args[1]);
    args.splice(0, 2);
  }

  if (args.length !== 1) {
    usage();
    process.exit(2);
  }

  const eventPath = path.resolve(args[0]);
  const schema = await readJson(schemaPath, 'schema');
  const event = await readJson(eventPath, 'event');

  validateEvent(schema, event);
  console.log(`VALID: ${eventPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => fail(error.message));
}
