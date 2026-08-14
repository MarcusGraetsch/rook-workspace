#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.env.ROOK_WORKSPACE_ROOT || '/root/.openclaw/workspace';
const RUNTIME_ROOT = process.env.ROOK_RUNTIME_ROOT || '/root/.openclaw/runtime';
const DEFAULT_ROUTING_LOG = process.env.ROOK_ROUTING_LOG || path.join(RUNTIME_ROOT, 'operations', 'routing-decisions.jsonl');
const DEFAULT_TASKS_DIR = path.join(ROOT, 'operations', 'tasks');
const DEFAULT_ARCHIVE_DIR = path.join(ROOT, 'operations', 'archive', 'tasks');
const DEFAULT_RUNTIME_STATE_DIR = path.join(RUNTIME_ROOT, 'operations', 'task-state');

const SUCCESS_STATUSES = new Set(['done', 'archived']);
const FAILURE_STATUSES = new Set(['blocked', 'failed', 'cancelled']);

export function normalizeActualBackend(modelRef, executor = null) {
  const text = `${modelRef || ''} ${executor || ''}`.toLowerCase();
  if (/\b(kimi|moonshot)/.test(text)) return 'kimi';
  if (/\bminimax/.test(text)) return 'minimax';
  if (/\b(claude|anthropic)/.test(text)) return 'claude';
  if (/\b(codex|openai|gpt[-_ ]?5|gpt[-_ ]?4)/.test(text)) return 'codex';
  return null;
}

export function classifyOutcome(task) {
  const status = String(task?.status || '').toLowerCase();
  if (SUCCESS_STATUSES.has(status)) return 'success';
  if (FAILURE_STATUSES.has(status)) return 'failure';
  return 'pending';
}

export function correlateRoutingOutcomes(records, tasksById) {
  return records
    .filter((record) => record?.kind === 'dispatch-shadow' && record?.task_id)
    .map((record) => {
      const task = tasksById.get(record.task_id) || null;
      const actualModel = task?.dispatch?.model || null;
      const actualExecutor = task?.dispatch?.executor || task?.claimed_by || null;
      const actualBackend = normalizeActualBackend(actualModel, actualExecutor);
      const outcome = task ? classifyOutcome(task) : 'unknown';
      return {
        task_id: record.task_id,
        timestamp: record.timestamp || null,
        task_type: record?.profile?.task_type || null,
        risk: record?.profile?.risk || null,
        complexity: record?.profile?.complexity || null,
        recommended_backend: record.recommended_backend || null,
        recommended_reviewer: record.reviewer || null,
        recommended_workflow: record.workflow || null,
        assigned_agent_at_dispatch: record.assigned_agent || null,
        actual_model: actualModel,
        actual_executor: actualExecutor,
        actual_backend: actualBackend,
        recommendation_match: actualBackend ? actualBackend === record.recommended_backend : null,
        status: task?.status || null,
        workflow_stage: task?.workflow_stage || null,
        attempts: task?.dispatch?.attempts ?? null,
        last_result: task?.dispatch?.last_result || null,
        failure_reason: task?.failure_reason || null,
        completed_at: task?.timestamps?.completed_at || null,
        outcome,
      };
    });
}

function increment(counter, key) {
  const label = key == null || key === '' ? 'unknown' : String(key);
  counter[label] = (counter[label] || 0) + 1;
}

export function summarizeOutcomes(rows) {
  const summary = {
    correlated: rows.length,
    with_task_state: rows.filter((row) => row.outcome !== 'unknown').length,
    successes: rows.filter((row) => row.outcome === 'success').length,
    failures: rows.filter((row) => row.outcome === 'failure').length,
    pending: rows.filter((row) => row.outcome === 'pending').length,
    unknown: rows.filter((row) => row.outcome === 'unknown').length,
    backend_known: rows.filter((row) => row.actual_backend).length,
    recommendation_matches: rows.filter((row) => row.recommendation_match === true).length,
    recommendation_mismatches: rows.filter((row) => row.recommendation_match === false).length,
    by_recommended_backend: {},
    by_actual_backend: {},
    by_outcome: {},
  };

  for (const row of rows) {
    increment(summary.by_recommended_backend, row.recommended_backend);
    increment(summary.by_actual_backend, row.actual_backend);
    increment(summary.by_outcome, row.outcome);
  }

  const comparable = summary.recommendation_matches + summary.recommendation_mismatches;
  summary.recommendation_match_rate = comparable > 0 ? summary.recommendation_matches / comparable : null;
  return summary;
}

async function readJsonl(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return text.split('\n').filter((line) => line.trim()).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function collectJsonFiles(rootDir, result = []) {
  let entries;
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return result;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) await collectJsonFiles(fullPath, result);
    else if (entry.isFile() && entry.name.endsWith('.json')) result.push(fullPath);
  }
  return result;
}

async function loadTaskMap(taskDirs, runtimeStateDir) {
  const map = new Map();
  for (const dir of taskDirs) {
    for (const filePath of await collectJsonFiles(dir)) {
      try {
        const task = JSON.parse(await fs.readFile(filePath, 'utf8'));
        if (task?.task_id) map.set(task.task_id, task);
      } catch {
        // Ignore malformed non-task JSON; outcome reporting must stay read-only.
      }
    }
  }

  for (const filePath of await collectJsonFiles(runtimeStateDir)) {
    try {
      const runtime = JSON.parse(await fs.readFile(filePath, 'utf8'));
      const taskId = runtime?.task_id || path.basename(filePath, '.json');
      if (!taskId) continue;
      const base = map.get(taskId) || { task_id: taskId };
      map.set(taskId, {
        ...base,
        ...runtime,
        dispatch: runtime.dispatch || base.dispatch,
        timestamps: { ...(base.timestamps || {}), ...(runtime.timestamps || {}) },
      });
    } catch {
      // Same fail-open policy as the routing shadow observer.
    }
  }
  return map;
}

function renderCounter(title, counter) {
  const rows = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return [title, ...(rows.length ? rows.map(([key, value]) => `  ${key}: ${value}`) : ['  keine Daten'])].join('\n');
}

function renderHuman(summary) {
  const match = summary.recommendation_match_rate == null
    ? '-'
    : `${Math.round(summary.recommendation_match_rate * 100)}%`;
  return [
    'Adaptive Routing — Outcome Report',
    `Korrelierte Shadow-Entscheidungen: ${summary.correlated}`,
    `Erfolg: ${summary.successes} · Fehler/Blocked: ${summary.failures} · Pending: ${summary.pending} · Unbekannt: ${summary.unknown}`,
    `Tatsächliches Backend bekannt: ${summary.backend_known}`,
    `Empfehlung entsprach tatsächlichem Backend: ${match}`,
    '',
    renderCounter('Empfohlen', summary.by_recommended_backend),
    '',
    renderCounter('Tatsächlich', summary.by_actual_backend),
    '',
    renderCounter('Outcome', summary.by_outcome),
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const details = args.includes('--details');
  const logIndex = args.indexOf('--log');
  const tasksIndex = args.indexOf('--tasks-dir');
  const archiveIndex = args.indexOf('--archive-dir');
  const runtimeIndex = args.indexOf('--runtime-state-dir');

  const routingLog = logIndex >= 0 ? path.resolve(args[logIndex + 1]) : DEFAULT_ROUTING_LOG;
  const tasksDir = tasksIndex >= 0 ? path.resolve(args[tasksIndex + 1]) : DEFAULT_TASKS_DIR;
  const archiveDir = archiveIndex >= 0 ? path.resolve(args[archiveIndex + 1]) : DEFAULT_ARCHIVE_DIR;
  const runtimeStateDir = runtimeIndex >= 0 ? path.resolve(args[runtimeIndex + 1]) : DEFAULT_RUNTIME_STATE_DIR;

  const records = await readJsonl(routingLog);
  const tasks = await loadTaskMap([tasksDir, archiveDir], runtimeStateDir);
  const rows = correlateRoutingOutcomes(records, tasks);
  const summary = summarizeOutcomes(rows);

  if (json) {
    process.stdout.write(`${JSON.stringify(details ? { summary, rows } : summary, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderHuman(summary)}\n`);
    if (details && rows.length > 0) {
      process.stdout.write('\nDetails\n');
      for (const row of rows) {
        process.stdout.write(`${row.task_id}: ${row.recommended_backend || '-'} → ${row.actual_backend || row.actual_model || '-'} · ${row.outcome}\n`);
      }
    }
  }
}

const directEntryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (directEntryHref && import.meta.url === directEntryHref) {
  main().catch((error) => {
    process.stderr.write(`routing-outcomes: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
