#!/usr/bin/env node

import { promises as fs, writeFileSync } from 'fs';

const PROC_SYS = '/proc/sys/fs/inotify';
const MIN_USER_INSTANCES = 512;
const MIN_USER_WATCHES = 262144;
const MIN_QUEUED_EVENTS = 16384;

async function readInt(name) {
  const raw = await fs.readFile(`${PROC_SYS}/${name}`, 'utf8');
  return Number.parseInt(raw.trim(), 10);
}

function inspectValue(name, actual, minimum) {
  if (!Number.isFinite(actual)) {
    return {
      severity: 'error',
      type: 'inotify_sysctl_unreadable',
      name,
      details: `${name} is not a finite integer`,
    };
  }

  if (actual < minimum) {
    return {
      severity: 'error',
      type: 'inotify_sysctl_too_low',
      name,
      actual,
      minimum,
      details: `${name}=${actual} is below required minimum ${minimum}`,
    };
  }

  return null;
}

async function main() {
  const values = {
    max_user_instances: await readInt('max_user_instances'),
    max_user_watches: await readInt('max_user_watches'),
    max_queued_events: await readInt('max_queued_events'),
  };

  const findings = [
    inspectValue('fs.inotify.max_user_instances', values.max_user_instances, MIN_USER_INSTANCES),
    inspectValue('fs.inotify.max_user_watches', values.max_user_watches, MIN_USER_WATCHES),
    inspectValue('fs.inotify.max_queued_events', values.max_queued_events, MIN_QUEUED_EVENTS),
  ].filter(Boolean);

  const summary = {
    checked_at: new Date().toISOString(),
    ok: !findings.some((finding) => finding.severity === 'error'),
    warning_count: findings.filter((finding) => finding.severity === 'warning').length,
    error_count: findings.filter((finding) => finding.severity === 'error').length,
    values,
    policy: {
      min_user_instances: MIN_USER_INSTANCES,
      min_user_watches: MIN_USER_WATCHES,
      min_queued_events: MIN_QUEUED_EVENTS,
    },
    findings,
  };

  writeFileSync(1, `${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
