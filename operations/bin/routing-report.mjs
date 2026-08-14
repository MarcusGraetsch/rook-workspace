#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const DEFAULT_LOG = process.env.ROOK_ROUTING_LOG || '/root/.openclaw/runtime/operations/routing-decisions.jsonl';

function increment(counter, key) {
  const label = key == null || key === '' ? 'unknown' : String(key);
  counter[label] = (counter[label] || 0) + 1;
}

export function summarizeRoutingRecords(records) {
  const shadow = records.filter((record) => record?.kind === 'dispatch-shadow');
  const summary = {
    total_records: records.length,
    dispatch_shadow_records: shadow.length,
    first_timestamp: shadow[0]?.timestamp || null,
    last_timestamp: shadow.at(-1)?.timestamp || null,
    by_task_type: {},
    by_backend: {},
    by_dispatcher_candidate: {},
    by_recommended_status: {},
    by_workflow: {},
    by_reviewer: {},
    by_assigned_agent: {},
    high_risk: 0,
    complex: 0,
    extra_cost_allowed: 0,
    manual_handoff_required: 0,
  };

  for (const record of shadow) {
    increment(summary.by_task_type, record?.profile?.task_type);
    increment(summary.by_backend, record?.recommended_backend);
    increment(summary.by_dispatcher_candidate, record?.execution?.dispatcher_candidate);
    increment(summary.by_recommended_status, record?.execution?.recommended_status);
    increment(summary.by_workflow, record?.workflow);
    increment(summary.by_reviewer, record?.reviewer || 'none');
    increment(summary.by_assigned_agent, record?.assigned_agent);
    if (record?.profile?.risk === 'high') summary.high_risk += 1;
    if (record?.profile?.complexity === 'complex') summary.complex += 1;
    if (record?.extra_cost_policy?.allowed === true) summary.extra_cost_allowed += 1;
    if (record?.execution?.manual_handoff_required === true) summary.manual_handoff_required += 1;
  }

  return summary;
}

async function readRecords(logPath) {
  let text;
  try {
    text = await fs.readFile(logPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const records = [];
  for (const [index, line] of text.split('\n').entries()) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      records.push({ kind: 'invalid-jsonl', line: index + 1 });
    }
  }
  return records;
}

function filterSince(records, days) {
  if (!(Number.isFinite(days) && days > 0)) return records;
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    const ts = Date.parse(record?.timestamp || '');
    return Number.isFinite(ts) && ts >= threshold;
  });
}

function renderCounter(title, counter) {
  const rows = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return `${title}: keine Daten`;
  return [title, ...rows.map(([key, value]) => `  ${key}: ${value}`)].join('\n');
}

function renderHuman(summary, logPath) {
  return [
    'Adaptive Routing — Shadow Report',
    `Log: ${logPath}`,
    `Beobachtete Dispatches: ${summary.dispatch_shadow_records}`,
    `Zeitraum: ${summary.first_timestamp || '-'} → ${summary.last_timestamp || '-'}`,
    `High-risk: ${summary.high_risk} · Komplex: ${summary.complex} · Manueller Handoff: ${summary.manual_handoff_required} · Zusatzkosten erlaubt: ${summary.extra_cost_allowed}`,
    '',
    renderCounter('Fachlich empfohlene Backends', summary.by_backend),
    '',
    renderCounter('Autonome Dispatcher-Kandidaten', summary.by_dispatcher_candidate),
    '',
    renderCounter('Availability der Empfehlung', summary.by_recommended_status),
    '',
    renderCounter('Task-Typen', summary.by_task_type),
    '',
    renderCounter('Workflows', summary.by_workflow),
    '',
    renderCounter('Reviewer', summary.by_reviewer),
    '',
    renderCounter('Aktuell zugewiesene Agenten', summary.by_assigned_agent),
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const logIndex = args.indexOf('--log');
  const daysIndex = args.indexOf('--days');
  const logPath = logIndex >= 0 ? path.resolve(args[logIndex + 1]) : DEFAULT_LOG;
  const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : null;

  const records = filterSince(await readRecords(logPath), days);
  const summary = summarizeRoutingRecords(records);
  process.stdout.write(`${json ? JSON.stringify(summary, null, 2) : renderHuman(summary, logPath)}\n`);
}

const directEntryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (directEntryHref && import.meta.url === directEntryHref) {
  main().catch((error) => {
    process.stderr.write(`routing-report: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
