#!/usr/bin/env node

import { promises as fs } from 'fs';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace');
const execFile = promisify(execFileCallback);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function collectTaskFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const targetPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTaskFiles(targetPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    files.push(targetPath);
  }

  return files;
}

async function trackedTaskFiles() {
  const { stdout } = await execFile('git', ['-C', WORKSPACE_DIR, 'ls-files', 'operations/tasks']);
  return new Set(
    stdout
      .split('\n')
      .map((value) => value.trim())
      .filter((value) => value.endsWith('.json'))
      .map((value) => path.join(WORKSPACE_DIR, value))
  );
}

function configuredAgentIds(config) {
  return new Set(
    Array.isArray(config?.agents?.list)
      ? config.agents.list
        .map((agent) => agent?.id)
        .filter((value) => typeof value === 'string' && value.length > 0)
      : []
  );
}

function normalizeClaimedBy(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  if (value.startsWith('dispatcher:')) {
    const [, agentId] = value.split(':', 2);
    return agentId || null;
  }

  return value;
}

async function main() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const agentIds = configuredAgentIds(config);
  const taskFiles = await collectTaskFiles(TASKS_DIR);
  const trackedFiles = await trackedTaskFiles();
  const findings = [];

  for (const taskFile of taskFiles.sort()) {
    const isTracked = trackedFiles.has(taskFile);
    let task;
    try {
      task = await readJson(taskFile);
    } catch (error) {
      findings.push({
        severity: isTracked ? 'error' : 'warning',
        type: 'task_parse_failed',
        task_file: path.relative(OPENCLAW_DIR, taskFile),
        tracked: isTracked,
        details: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const taskId = typeof task?.task_id === 'string' ? task.task_id : path.basename(taskFile, '.json');
    const assignedAgent = typeof task?.assigned_agent === 'string' ? task.assigned_agent : null;
    const claimedBy = typeof task?.claimed_by === 'string' ? task.claimed_by : null;
    const normalizedClaimedBy = normalizeClaimedBy(claimedBy);

    if (assignedAgent && !agentIds.has(assignedAgent)) {
      findings.push({
        severity: 'warning',
        type: 'assigned_agent_unbound',
        task_id: taskId,
        task_file: path.relative(OPENCLAW_DIR, taskFile),
        assigned_agent: assignedAgent,
        status: task?.status || null,
        workflow_stage: task?.workflow_stage || null,
      });
    }

    if (claimedBy && normalizedClaimedBy && !agentIds.has(normalizedClaimedBy)) {
      findings.push({
        severity: 'warning',
        type: 'claimed_by_unbound',
        task_id: taskId,
        task_file: path.relative(OPENCLAW_DIR, taskFile),
        claimed_by: claimedBy,
        normalized_claimed_by: normalizedClaimedBy,
        status: task?.status || null,
        workflow_stage: task?.workflow_stage || null,
      });
    }
  }

  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;
  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const summary = {
    checked_at: new Date().toISOString(),
    openclaw_config: OPENCLAW_CONFIG_PATH,
    tasks_dir: TASKS_DIR,
    ok: errorCount === 0,
    warning_count: warningCount,
    error_count: errorCount,
    configured_agent_count: agentIds.size,
    findings,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = errorCount === 0 ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
