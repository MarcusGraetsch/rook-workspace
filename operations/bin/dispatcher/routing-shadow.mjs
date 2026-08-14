import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { routeTask } from '../adaptive-router.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY = path.resolve(HERE, '../../config/adaptive-routing-policy.json');
const DEFAULT_LOG = process.env.ROOK_ROUTING_LOG || '/root/.openclaw/runtime/operations/routing-decisions.jsonl';

function isShadowEnabled(value = process.env.ROOK_ADAPTIVE_ROUTING_SHADOW) {
  if (value == null || value === '') return true;
  return !['0', 'false', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

export function buildRoutingText(task) {
  const checklist = Array.isArray(task?.checklist)
    ? task.checklist.map((item) => item?.title).filter(Boolean).join('; ')
    : '';
  const labels = Array.isArray(task?.labels) ? task.labels.filter(Boolean).join(', ') : '';

  return [
    task?.title,
    task?.description,
    task?.intake?.brief,
    task?.intake?.refinement_summary,
    checklist ? `Checklist: ${checklist}` : null,
    labels ? `Labels: ${labels}` : null,
    task?.related_repo ? `Repository: ${task.related_repo}` : null,
    task?.assigned_agent ? `Assigned agent: ${task.assigned_agent}` : null,
  ].filter(Boolean).join('\n').trim();
}

async function readPolicy(policyPath) {
  return JSON.parse(await fs.readFile(policyPath, 'utf8'));
}

async function appendJsonl(logPath, record) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf8');
}

export async function observeRouting(task, options = {}) {
  if (!isShadowEnabled(options.enabled)) {
    return { enabled: false, decision: null, record: null };
  }

  const text = buildRoutingText(task);
  if (!text) {
    return { enabled: true, decision: null, record: null };
  }

  const policyPath = options.policyPath || DEFAULT_POLICY;
  const logPath = options.logPath || DEFAULT_LOG;
  const policy = await readPolicy(policyPath);
  const decision = routeTask(text, policy);
  const timestamp = options.nowIso || new Date().toISOString();

  const record = {
    timestamp,
    kind: 'dispatch-shadow',
    task_id: task?.task_id || null,
    project_id: task?.project_id || null,
    source_channel: options.sourceChannel || task?.source_channel || null,
    assigned_agent: task?.assigned_agent || null,
    current_status: task?.status || null,
    input: text,
    ...decision,
  };

  await appendJsonl(logPath, record);
  return { enabled: true, decision, record };
}
