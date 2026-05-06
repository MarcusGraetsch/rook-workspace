#!/usr/bin/env node
/**
 * create-monthly-autoresearch.mjs
 *
 * Creates a canonical autoresearch task for a given target system and
 * immediately marks it as "ready" so the dispatcher can pick it up.
 * Designed to run monthly via cron.
 *
 * Targets cycle: claude-mem → research-pipeline → rook-dashboard (rotating)
 *
 * Usage:
 *   node create-monthly-autoresearch.mjs [--target <system>] [--dry-run]
 *
 * The --target flag overrides the automatic rotation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const TASKS_DIR = '/root/.openclaw/workspace/operations/tasks/ops';
const LOG_FILE = '/root/.openclaw/runtime/logs/create-monthly-autoresearch.jsonl';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCED_TARGET = (() => {
  const idx = process.argv.indexOf('--target');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// Rotation: each month gets a different target
const TARGETS = [
  {
    system: 'claude-mem',
    path: '/root/.openclaw/claude-mem',
    description: 'Memory plugin (SQLite + Chroma + Express worker on port 37777). Optimize accuracy of memory retrieval, hook latency, and compression quality.',
    focus: 'retrieval accuracy, hook latency, compression quality',
  },
  {
    system: 'research-pipeline',
    path: '/root/.openclaw/workspace/projects/digital-research/data',
    description: 'Weekly research pipeline (email scan, RSS, clean, label, briefing). Improve article labeling precision, scan coverage, and digest quality.',
    focus: 'labeling precision, scan coverage, digest relevance',
  },
  {
    system: 'rook-dashboard',
    path: '/root/.openclaw/workspace/engineering/rook-dashboard',
    description: 'Next.js Kanban dashboard for task management. Improve performance, fix UX issues, and add missing features.',
    focus: 'load time, UX completeness, Kanban reliability',
  },
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function log(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(line);
  fs.appendFile(LOG_FILE, `${line}\n`, 'utf8').catch(() => {});
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function nextTaskId() {
  const files = await fs.readdir(TASKS_DIR).catch(() => []);
  const numbers = files
    .filter((f) => f.startsWith('ops-') && f.endsWith('.json'))
    .map((f) => parseInt(f.replace('ops-', '').replace('.json', ''), 10))
    .filter((n) => !Number.isNaN(n));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const next = max + 1;
  return `ops-${String(next).padStart(4, '0')}`;
}

function pickTarget() {
  if (FORCED_TARGET) {
    return TARGETS.find((t) => t.system === FORCED_TARGET) || TARGETS[0];
  }
  const month = new Date().getMonth(); // 0–11
  return TARGETS[month % TARGETS.length];
}

async function createTask(target) {
  const taskId = await nextTaskId();
  const now = new Date().toISOString();
  const monthYear = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const task = {
    task_id: taskId,
    project_id: 'rook-workspace',
    title: `Autoresearch: ${target.system} (${monthYear})`,
    description: [
      `Monthly autoresearch loop for **${target.system}**.`,
      '',
      target.description,
      '',
      `**Target path:** \`${target.path}\``,
      `**Focus areas:** ${target.focus}`,
      '',
      'Run /autoresearch (agent-growth-suite) against this target.',
      'Measure before/after. Keep only improvements that score better.',
      'Commit results and document in AUTORESEARCH-LOG.md.',
    ].join('\n'),
    status: 'ready',
    assigned_agent: 'rook',
    claimed_by: null,
    priority: 'medium',
    labels: ['autoresearch', 'monthly', target.system],
    dependencies: [],
    blocked_by: [],
    blocked_reason: null,
    failure_reason: null,
    handoff_notes: '',
    source_channel: 'system:monthly-autoresearch',
    artifacts: [],
    checklist: [
      { title: `Run /autoresearch on ${target.system}`, completed: false, position: 0 },
      { title: 'Document baseline metrics', completed: false, position: 1 },
      { title: 'Implement top improvements', completed: false, position: 2 },
      { title: 'Measure and compare', completed: false, position: 3 },
      { title: 'Commit and document in AUTORESEARCH-LOG.md', completed: false, position: 4 },
    ],
    timestamps: {
      created_at: now,
      updated_at: now,
      started_at: null,
      completed_at: null,
      claimed_at: null,
    },
  };

  return { taskId, task };
}

async function main() {
  await ensureDir(path.dirname(LOG_FILE));
  await ensureDir(TASKS_DIR);

  const target = pickTarget();
  log({ action: 'start', target: target.system, dry_run: DRY_RUN });

  const { taskId, task } = await createTask(target);
  const filePath = path.join(TASKS_DIR, `${taskId}.json`);

  if (DRY_RUN) {
    log({ action: 'dry_run', task_id: taskId, target: target.system, file: filePath });
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  await writeJson(filePath, task);
  log({ action: 'created', task_id: taskId, target: target.system, file: filePath });
  console.error(`Created ${taskId}: Autoresearch ${target.system} → ${filePath}`);
}

main().catch((err) => {
  console.error(`create-monthly-autoresearch fatal: ${err.message}`);
  process.exit(1);
});
