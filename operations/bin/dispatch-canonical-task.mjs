#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT_DIR = '/root/.openclaw/workspace';
const OPERATIONS_DIR = path.join(ROOT_DIR, 'operations');
const RUNTIME_ROOT = process.env.ROOK_RUNTIME_ROOT || '/root/.openclaw/runtime';
const RUNTIME_OPERATIONS_DIR =
  process.env.ROOK_RUNTIME_OPERATIONS_DIR || path.join(RUNTIME_ROOT, 'operations');
const TASKS_DIR = path.join(OPERATIONS_DIR, 'tasks');
const TASK_STATE_DIR = path.join(RUNTIME_OPERATIONS_DIR, 'task-state');
const DISPATCHER_PATH = path.join(OPERATIONS_DIR, 'bin', 'task-dispatcher.mjs');
const DISPATCH_TIMEOUT_SECONDS = Number(process.env.ROOK_DISPATCH_TIMEOUT_SECONDS || '35');
const VALID_TASK_ID = /^[a-z0-9]+-\d{4,}$/i;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function runtimeTaskStatePath(projectId, taskId) {
  return path.join(TASK_STATE_DIR, projectId, `${taskId}.json`);
}

function applyRuntimeTaskState(baseTask, runtimeState) {
  if (!runtimeState || typeof runtimeState !== 'object') {
    return baseTask;
  }

  const merged = { ...baseTask, ...runtimeState };
  if (runtimeState.dispatch) merged.dispatch = runtimeState.dispatch;
  if (runtimeState.timestamps) {
    merged.timestamps = {
      ...(baseTask.timestamps || {}),
      ...runtimeState.timestamps,
    };
  }
  if (runtimeState.github_issue) merged.github_issue = runtimeState.github_issue;
  if (runtimeState.github_pull_request) merged.github_pull_request = runtimeState.github_pull_request;
  return merged;
}

async function findTaskFile(taskId) {
  const projectDirs = await fs.readdir(TASKS_DIR).catch(() => []);
  for (const projectId of projectDirs) {
    const candidate = path.join(TASKS_DIR, projectId, `${taskId}.json`);
    try {
      await fs.access(candidate);
      return { filePath: candidate, projectId };
    } catch {
      // Continue search.
    }
  }
  return null;
}

function summarizeTask(task) {
  return {
    task_id: task.task_id,
    title: task.title || null,
    status: task.status || null,
    workflow_stage: task.workflow_stage || null,
    assigned_agent: task.assigned_agent || null,
    claimed_by: task.claimed_by || null,
    source_channel: task.source_channel || null,
    branch: task.branch || null,
    failure_reason: task.failure_reason || null,
    last_heartbeat: task.last_heartbeat || null,
    timestamps: task.timestamps || null,
  };
}

function runDispatcher(taskId) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        DISPATCHER_PATH,
        '--task',
        taskId,
        '--limit',
        '1',
        '--dispatch-mode',
        'hook',
        '--source-channel',
        'discord:dispatch-command',
      ],
      {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          ROOK_DISPATCH_TIMEOUT_SECONDS: String(DISPATCH_TIMEOUT_SECONDS),
        },
      }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, (DISPATCH_TIMEOUT_SECONDS + 5) * 1000);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        code: timedOut ? 124 : (code ?? 1),
        signal: signal || null,
        timed_out: timedOut,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function main() {
  const taskId = String(process.argv[2] || '').trim();
  if (!VALID_TASK_ID.test(taskId)) {
    console.error(JSON.stringify({
      ok: false,
      error: 'invalid_task_id',
      message: 'Expected a canonical task id like ops-0019.',
    }, null, 2));
    process.exit(2);
  }

  const found = await findTaskFile(taskId);
  if (!found) {
    console.error(JSON.stringify({
      ok: false,
      error: 'task_not_found',
      task_id: taskId,
      message: `Could not locate ${taskId}.json under ${TASKS_DIR}.`,
    }, null, 2));
    process.exit(3);
  }

  const beforeBase = await readJson(found.filePath);
  const beforeState = await readJsonIfExists(runtimeTaskStatePath(found.projectId, taskId));
  const before = summarizeTask(applyRuntimeTaskState(beforeBase, beforeState));
  const dispatch = await runDispatcher(taskId);
  const afterBase = await readJson(found.filePath);
  const afterState = await readJsonIfExists(runtimeTaskStatePath(found.projectId, taskId));
  const after = summarizeTask(applyRuntimeTaskState(afterBase, afterState));
  const accepted = Boolean(after.claimed_by) || ['in_progress', 'testing', 'review'].includes(String(after.status || ''));

  const payload = {
    ok: dispatch.ok,
    accepted,
    task_id: taskId,
    file_path: found.filePath,
    before,
    after,
    dispatch,
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(dispatch.ok ? 0 : dispatch.code || 1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: 'dispatch_wrapper_failed',
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
