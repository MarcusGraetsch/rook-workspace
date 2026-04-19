#!/usr/bin/env node
/**
 * refine-canonical-task.mjs
 *
 * Invokes Rook to refine an intake task: adds plan, steps, acceptance criteria,
 * and advances status to "ready". Called by discord-dispatch-bridge.mjs in response
 * to a /refine <task-id> Discord command.
 *
 * Usage: node refine-canonical-task.mjs <task-id>
 *
 * Output: JSON to stdout with { ok, accepted, task_id, before, after, rook }
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT_DIR = '/root/.openclaw';
const WORKSPACE_DIR = path.join(ROOT_DIR, 'workspace');
const OPERATIONS_DIR = path.join(WORKSPACE_DIR, 'operations');
const TASKS_DIR = path.join(OPERATIONS_DIR, 'tasks');
const VALID_TASK_ID = /^[a-z0-9]+-\d{4,}$/i;
const ROOK_TIMEOUT_SECONDS = Number(process.env.ROOK_REFINE_TIMEOUT_SECONDS || '120');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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

function taskSummary(task) {
  return {
    task_id: task.task_id,
    title: task.title || null,
    status: task.status || null,
    workflow_stage: task.workflow_stage || null,
    assigned_agent: task.assigned_agent || null,
    has_plan: Boolean(task.plan?.approach),
    timestamps: task.timestamps || null,
  };
}

function buildRookPrompt(task) {
  const lines = [
    `Refine canonical task ${task.task_id}.`,
    ``,
    `Task file: ${TASKS_DIR}/${task.project_id}/${task.task_id}.json`,
    ``,
    `The task is currently at status "${task.status}". Your job:`,
    `1. Read the task file at the path above.`,
    `2. Review the title and description.`,
    `3. Write a plan back to the canonical file with these fields:`,
    `   - plan.approach: a 1-2 sentence scope statement`,
    `   - plan.steps: array of 3-5 steps, each with { id, title, owner, completed: false }`,
    `   - plan.acceptance_criteria: array of 2-4 criteria, each with { id, description, met: null }`,
    `   - plan.context: any relevant context from the description`,
    `   - plan.planned_by: "rook"`,
    `   - plan.planned_at: current ISO timestamp`,
    `   - plan.risks: array of 0-3 brief risk strings`,
    `   - plan.out_of_scope: array of 0-3 things explicitly excluded`,
    `4. Set task.status to "ready" and task.workflow_stage to "ready".`,
    `5. Update task.timestamps.updated_at to now.`,
    `6. Write the updated JSON back to the task file.`,
    `7. Reply with a one-paragraph summary of what you planned and why.`,
    ``,
    `Do NOT change: task_id, project_id, title, description, assigned_agent, priority, related_repo, branch, dependencies, labels, github_issue.`,
    `Do NOT dispatch or claim the task. Just update the plan and status.`,
  ];
  return lines.join('\n');
}

function runRook(prompt) {
  return new Promise((resolve) => {
    const child = spawn(
      'openclaw',
      ['agent', '--agent', 'rook', '--message', prompt, '--json'],
      {
        cwd: ROOT_DIR,
        env: process.env,
      }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, ROOK_TIMEOUT_SECONDS * 1000);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        code: timedOut ? 124 : (code ?? 1),
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
    }));
    process.exit(2);
  }

  const found = await findTaskFile(taskId);
  if (!found) {
    console.error(JSON.stringify({
      ok: false,
      error: 'task_not_found',
      task_id: taskId,
      message: `Could not locate ${taskId}.json under ${TASKS_DIR}.`,
    }));
    process.exit(3);
  }

  const beforeTask = await readJson(found.filePath);
  const before = taskSummary(beforeTask);

  if (beforeTask.status !== 'intake') {
    process.stdout.write(JSON.stringify({
      ok: false,
      accepted: false,
      task_id: taskId,
      before,
      after: before,
      rook: null,
      message: `Task ${taskId} is in status "${beforeTask.status}", not "intake". Only intake tasks can be refined.`,
    }, null, 2) + '\n');
    process.exit(0);
  }

  const prompt = buildRookPrompt(beforeTask);
  const rookResult = await runRook(prompt);

  // Re-read task after Rook run to capture writes
  let afterTask = null;
  try {
    afterTask = await readJson(found.filePath);
  } catch {
    afterTask = beforeTask;
  }
  const after = taskSummary(afterTask);
  const accepted = afterTask.status === 'ready' && Boolean(afterTask.plan?.approach);

  // Extract Rook's text response if available
  let rookReply = null;
  try {
    const parsed = JSON.parse(rookResult.stdout);
    rookReply = parsed?.result?.payloads?.[0]?.text || null;
  } catch {
    rookReply = rookResult.stdout || null;
  }

  const payload = {
    ok: rookResult.ok,
    accepted,
    task_id: taskId,
    before,
    after,
    rook: {
      ok: rookResult.ok,
      code: rookResult.code,
      timed_out: rookResult.timed_out,
      reply: rookReply,
      stderr: rookResult.stderr || null,
    },
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(rookResult.ok ? 0 : rookResult.code || 1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: 'refine_wrapper_failed',
    message: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
