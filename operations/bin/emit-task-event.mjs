#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_SCHEMA, readJson, validateEvent } from './validate-event.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPERATIONS_DIR = path.resolve(__dirname, '..');
const TASKS_DIR = process.env.ROOK_TASKS_DIR || path.join(OPERATIONS_DIR, 'tasks');
const EVENTS_DIR = process.env.ROOK_EVENTS_DIR || path.join(OPERATIONS_DIR, 'events');

function usage() {
  console.error([
    'Usage: emit-task-event.mjs --task-id <id> --status-before <status> --status-after <status> [options]',
    '',
    'Options:',
    '  --source <system>          Source system, default: rook',
    '  --target <system>          Target system, default: hermes',
    '  --event-type <type>        Event type, default: task_state.changed',
    '  --classification <class>   bridge-safe|ops-internal|private-redacted, default: bridge-safe',
    '  --ttl-hours <n>            Time to live, default: 168',
    '  --summary <text>           Override sanitized summary',
    '  --dry-run                  Print event without writing outbox file',
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    taskId: null,
    statusBefore: null,
    statusAfter: null,
    source: 'rook',
    target: 'hermes',
    eventType: 'task_state.changed',
    classification: 'bridge-safe',
    ttlHours: 168,
    summary: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--task-id') {
      options.taskId = argv[++index];
    } else if (arg === '--status-before') {
      options.statusBefore = argv[++index];
    } else if (arg === '--status-after') {
      options.statusAfter = argv[++index];
    } else if (arg === '--source') {
      options.source = argv[++index];
    } else if (arg === '--target') {
      options.target = argv[++index];
    } else if (arg === '--event-type') {
      options.eventType = argv[++index];
    } else if (arg === '--classification') {
      options.classification = argv[++index];
    } else if (arg === '--ttl-hours') {
      options.ttlHours = Number(argv[++index]);
    } else if (arg === '--summary') {
      options.summary = argv[++index];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      usage();
      process.exit(2);
    }
  }

  if (!options.taskId || !options.statusBefore || !options.statusAfter) {
    usage();
    process.exit(2);
  }
  if (!Number.isInteger(options.ttlHours)) {
    usage();
    process.exit(2);
  }

  return options;
}

function safeName(value) {
  return String(value || 'event')
    .replace(/[^A-Za-z0-9._:-]/g, '-')
    .slice(0, 180);
}

async function readTaskFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function findTask(taskId, tasksDir = TASKS_DIR) {
  const projectDirs = await readdir(tasksDir, { withFileTypes: true }).catch(() => []);
  for (const projectDirent of projectDirs) {
    if (!projectDirent.isDirectory()) continue;
    const projectDir = path.join(tasksDir, projectDirent.name);
    const files = await readdir(projectDir, { withFileTypes: true }).catch(() => []);
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      const filePath = path.join(projectDir, file.name);
      const task = await readTaskFile(filePath).catch(() => null);
      if (task?.task_id === taskId) {
        return { task, filePath };
      }
    }
  }
  throw new Error(`task not found: ${taskId}`);
}

function buildTaskSummary(task, options) {
  if (options.summary) return options.summary;
  return [
    `Task ${task.task_id} changed from ${options.statusBefore} to ${options.statusAfter}.`,
    `Title: ${task.title || 'untitled'}.`,
    `Project: ${task.project_id || 'unknown'}.`,
    `Assigned agent: ${task.assigned_agent || 'unknown'}.`,
  ].join(' ');
}

function buildEvent({ task, taskPath, options, now }) {
  const timestamp = now.toISOString();
  const compactTime = timestamp.replace(/[-:.]/g, '').replace('T', '_').replace('Z', 'Z');
  const correlationId = `corr_${task.task_id}_${compactTime}`;
  const idempotencyKey = [
    options.eventType,
    task.task_id,
    options.statusBefore,
    options.statusAfter,
    task.timestamps?.updated_at || task.timestamps?.completed_at || timestamp,
  ].join(':');

  return {
    event_id: `evt_${compactTime}_${safeName(task.task_id)}_${safeName(options.statusAfter)}`,
    schema_version: 'rook-hermes-event.v1',
    source_system: options.source || 'rook',
    target_system: options.target,
    event_type: options.eventType,
    task_id: task.task_id,
    correlation_id: correlationId,
    idempotency_key: idempotencyKey,
    classification: options.classification,
    created_at: timestamp,
    ttl_hours: options.ttlHours,
    payload: {
      status_before: options.statusBefore,
      status_after: options.statusAfter,
      project_id: task.project_id,
      title: task.title,
      related_repo: task.related_repo,
      assigned_agent: task.assigned_agent,
      workflow_stage: task.workflow_stage || null,
      priority: task.priority || null,
      summary: buildTaskSummary(task, options),
      task_path: path.relative(OPERATIONS_DIR, taskPath),
      artifacts: Array.isArray(task.artifacts) ? task.artifacts : [],
      commits: Array.isArray(task.commits) ? task.commits : [],
    },
    acks: [],
    delivery: {
      state: 'pending',
      attempts: 0,
      next_attempt_at: timestamp,
    },
  };
}

export async function emitTaskEvent(options) {
  const { task, filePath } = await findTask(options.taskId, options.tasksDir || TASKS_DIR);
  const schema = await readJson(DEFAULT_SCHEMA, 'schema');
  const event = buildEvent({ task, taskPath: filePath, options, now: new Date() });
  validateEvent(schema, event);

  const outboxDir = path.join(options.eventsDir || EVENTS_DIR, 'outbox');
  const target = path.join(outboxDir, `${safeName(event.event_id)}.json`);
  if (!options.dryRun) {
    await mkdir(outboxDir, { recursive: true });
    await writeFile(target, `${JSON.stringify(event, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  }
  return { event, target, task_path: filePath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await emitTaskEvent(options);
  console.log(JSON.stringify({
    ok: true,
    dry_run: options.dryRun,
    target: result.target,
    task_path: result.task_path,
    event: result.event,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`EMIT_TASK_EVENT_FAILED: ${error.message}`);
    process.exit(1);
  });
}
