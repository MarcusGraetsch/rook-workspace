#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = '/root/.openclaw';
const POLICY_PATH = path.join(ROOT_DIR, 'workspace', 'operations', 'config', 'runtime-posture-policy.json');
const APPROVED_VALUES = new Set(['1', 'true', 'yes', 'approved']);

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeApprovalValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

export async function checkApproval(scope, options = {}) {
  const policy = await readJson(POLICY_PATH, null);
  const gate = policy?.approval_gates?.[scope];

  if (!gate || typeof gate !== 'object') {
    return {
      ok: false,
      skipped: Boolean(options.optional),
      scope,
      envVar: null,
      value: null,
      reason: `approval gate missing for ${scope}`,
    };
  }

  const envVar = typeof gate.env === 'string' ? gate.env.trim() : '';
  if (!envVar) {
    return {
      ok: false,
      skipped: Boolean(options.optional),
      scope,
      envVar: null,
      value: null,
      reason: `approval gate missing env for ${scope}`,
    };
  }

  const rawValue = process.env[envVar];
  const approved = APPROVED_VALUES.has(normalizeApprovalValue(rawValue));

  if (!approved) {
    return {
      ok: false,
      skipped: Boolean(options.optional),
      scope,
      envVar,
      value: rawValue ?? null,
      reason: `${envVar} not approved`,
    };
  }

  return {
    ok: true,
    skipped: false,
    scope,
    envVar,
    value: rawValue ?? null,
    description: typeof gate.description === 'string' ? gate.description : '',
  };
}

async function main() {
  const scope = String(process.argv[2] || '').trim();
  const optional = process.argv.includes('--optional');

  if (!scope) {
    process.stderr.write('Usage: approval-gate.mjs <scope> [--optional]\n');
    process.exit(2);
  }

  const result = await checkApproval(scope, { optional });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok || result.skipped ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
