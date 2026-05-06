#!/usr/bin/env node
/**
 * run-lobster-flow.mjs
 *
 * Checkpoint manager for .lobster taskflow definitions.
 * Provides durable step execution across restarts.
 *
 * The agent running a lobster flow uses this script to:
 *   1. Start a new run (creates checkpoint)
 *   2. Get the current step's command
 *   3. Execute the command using its tools
 *   4. Advance to the next step (or mark failed/done)
 *
 * Usage:
 *   node run-lobster-flow.mjs start <flow-name> [-- --param value ...]
 *   node run-lobster-flow.mjs status <run-id>
 *   node run-lobster-flow.mjs step <run-id>           # print current step
 *   node run-lobster-flow.mjs advance <run-id>        # mark step done, print next
 *   node run-lobster-flow.mjs fail <run-id> <reason>  # mark step/run failed
 *   node run-lobster-flow.mjs done <run-id>           # mark entire run complete
 *   node run-lobster-flow.mjs list                    # list all runs
 *
 * Lobster files live in: rook-agent/skills/taskflow/examples/
 * Checkpoint files live in: /root/.openclaw/runtime/lobster-runs/
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const LOBSTER_DIR = '/root/.openclaw/rook-agent/skills/taskflow/examples';
const RUNS_DIR = '/root/.openclaw/runtime/lobster-runs';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function writeJson(p, data) {
  await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// Minimal YAML-ish lobster parser (handles key: value and lists)
// ---------------------------------------------------------------------------

function parseLobster(text) {
  // Strip frontmatter (--- ... ---)
  const stripped = text.replace(/^---[\s\S]*?---\n?/, '').trim();

  const result = { name: null, description: null, params: [], steps: [] };
  const lines = stripped.split('\n');

  let i = 0;
  let currentStep = null;
  let inSteps = false;
  let inStep = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith('#')) { i++; continue; }

    // Top-level keys
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      inStep = false;
      const match = trimmed.match(/^(\w[\w-]*):\s*(.*)?$/);
      if (!match) { i++; continue; }
      const [, key, val] = match;
      if (key === 'name') { result.name = val.replace(/['"]/g, ''); }
      else if (key === 'description') { result.description = val.replace(/['"]/g, ''); }
      else if (key === 'steps') { inSteps = true; }
      else if (key === 'params') { /* handled inline */ }
      i++; continue;
    }

    // Step entries (2-space indent)
    if (inSteps && line.match(/^\s{2}-\s+id:\s+/)) {
      if (currentStep) result.steps.push(currentStep);
      const idMatch = trimmed.match(/^-\s+id:\s+(.+)$/);
      currentStep = { id: idMatch ? idMatch[1].trim() : `step-${result.steps.length}`, description: null, command: null, checkpoint: false, on_fail: 'abort' };
      inStep = true;
      i++; continue;
    }

    // Step fields (4-space indent)
    if (inStep && currentStep && line.match(/^\s{4}\w/)) {
      const kv = trimmed.match(/^(\w[\w_]*):\s*(.*)?$/);
      if (kv) {
        const [, k, v] = kv;
        if (k === 'description') currentStep.description = v.replace(/['"]/g, '');
        else if (k === 'command') {
          // Collect multi-line command (>- or plain)
          let cmd = v.replace(/^>-\s*/, '').trim();
          // Look ahead for continuation lines (6+ spaces)
          while (i + 1 < lines.length && lines[i + 1].match(/^\s{6}/)) {
            i++;
            cmd += ' ' + lines[i].trim();
          }
          currentStep.command = cmd;
        }
        else if (k === 'checkpoint') currentStep.checkpoint = v === 'true';
        else if (k === 'on_fail') currentStep.on_fail = v;
        else if (k === 'expect_stdout') currentStep.expect_stdout = v;
        else currentStep[k] = v;
      }
      i++; continue;
    }

    i++;
  }

  if (currentStep) result.steps.push(currentStep);
  return result;
}

// ---------------------------------------------------------------------------
// Parameter substitution
// ---------------------------------------------------------------------------

function substituteParams(str, params) {
  return str.replace(/\$\{(\w+)(?::-(.*?))?\}/g, (_, name, fallback) => {
    return params[name] ?? fallback ?? `\${${name}}`;
  });
}

function applyParams(flow, params) {
  const result = { ...flow, steps: flow.steps.map((step) => ({
    ...step,
    command: step.command ? substituteParams(step.command, params) : step.command,
    description: step.description ? substituteParams(step.description, params) : step.description,
  })) };
  return result;
}

// ---------------------------------------------------------------------------
// Parse CLI params after --
// ---------------------------------------------------------------------------

function parseRunParams(args) {
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      params[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdStart(flowName, extraArgs) {
  await ensureDir(RUNS_DIR);
  const lobsterPath = path.join(LOBSTER_DIR, `${flowName}.lobster`);
  const raw = await fs.readFile(lobsterPath, 'utf8').catch(() => null);
  if (!raw) {
    console.error(`Flow not found: ${lobsterPath}`);
    process.exit(1);
  }

  const flow = parseLobster(raw);
  const params = parseRunParams(extraArgs);
  const populated = applyParams(flow, params);

  const runId = `${flowName}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  const run = {
    run_id: runId,
    flow_name: flowName,
    status: 'running',
    current_step_index: 0,
    params,
    steps_total: populated.steps.length,
    steps_done: [],
    started_at: now,
    updated_at: now,
    finished_at: null,
    failure_reason: null,
    flow: populated,
  };

  await writeJson(path.join(RUNS_DIR, `${runId}.json`), run);

  console.log(JSON.stringify({
    ok: true,
    run_id: runId,
    flow_name: flowName,
    steps_total: populated.steps.length,
    current_step: populated.steps[0] || null,
    message: `Run started. Execute the step command, then: node run-lobster-flow.mjs advance ${runId}`,
  }, null, 2));
}

async function cmdStatus(runId) {
  const run = await readJson(path.join(RUNS_DIR, `${runId}.json`)).catch(() => null);
  if (!run) { console.error(`Run not found: ${runId}`); process.exit(1); }
  const step = run.flow.steps[run.current_step_index] || null;
  console.log(JSON.stringify({
    run_id: run.run_id,
    flow_name: run.flow_name,
    status: run.status,
    current_step_index: run.current_step_index,
    steps_total: run.steps_total,
    steps_done: run.steps_done,
    current_step: step,
    params: run.params,
    started_at: run.started_at,
    updated_at: run.updated_at,
    failure_reason: run.failure_reason || null,
  }, null, 2));
}

async function cmdAdvance(runId) {
  const runPath = path.join(RUNS_DIR, `${runId}.json`);
  const run = await readJson(runPath).catch(() => null);
  if (!run) { console.error(`Run not found: ${runId}`); process.exit(1); }
  if (run.status !== 'running') { console.error(`Run is ${run.status}, cannot advance`); process.exit(1); }

  const completedStep = run.flow.steps[run.current_step_index];
  run.steps_done.push({ step_id: completedStep?.id, completed_at: new Date().toISOString() });
  run.current_step_index += 1;
  run.updated_at = new Date().toISOString();

  if (run.current_step_index >= run.steps_total) {
    run.status = 'done';
    run.finished_at = run.updated_at;
    await writeJson(runPath, run);
    console.log(JSON.stringify({ ok: true, run_id: runId, status: 'done', message: 'All steps complete.' }, null, 2));
    return;
  }

  const nextStep = run.flow.steps[run.current_step_index];
  await writeJson(runPath, run);
  console.log(JSON.stringify({
    ok: true,
    run_id: runId,
    status: 'running',
    completed_step: completedStep?.id,
    current_step_index: run.current_step_index,
    current_step: nextStep,
    message: `Execute the step command, then: node run-lobster-flow.mjs advance ${runId}`,
  }, null, 2));
}

async function cmdFail(runId, reason) {
  const runPath = path.join(RUNS_DIR, `${runId}.json`);
  const run = await readJson(runPath).catch(() => null);
  if (!run) { console.error(`Run not found: ${runId}`); process.exit(1); }
  run.status = 'failed';
  run.failure_reason = reason || 'unspecified';
  run.finished_at = new Date().toISOString();
  run.updated_at = run.finished_at;
  await writeJson(runPath, run);
  console.log(JSON.stringify({ ok: true, run_id: runId, status: 'failed', reason: run.failure_reason }, null, 2));
}

async function cmdDone(runId) {
  const runPath = path.join(RUNS_DIR, `${runId}.json`);
  const run = await readJson(runPath).catch(() => null);
  if (!run) { console.error(`Run not found: ${runId}`); process.exit(1); }
  run.status = 'done';
  run.finished_at = new Date().toISOString();
  run.updated_at = run.finished_at;
  await writeJson(runPath, run);
  console.log(JSON.stringify({ ok: true, run_id: runId, status: 'done' }, null, 2));
}

async function cmdList() {
  await ensureDir(RUNS_DIR);
  const files = await fs.readdir(RUNS_DIR);
  const runs = await Promise.all(
    files.filter((f) => f.endsWith('.json')).map(async (f) => {
      const run = await readJson(path.join(RUNS_DIR, f)).catch(() => null);
      if (!run) return null;
      return {
        run_id: run.run_id,
        flow_name: run.flow_name,
        status: run.status,
        current_step_index: run.current_step_index,
        steps_total: run.steps_total,
        started_at: run.started_at,
        updated_at: run.updated_at,
      };
    })
  );
  console.log(JSON.stringify(runs.filter(Boolean).sort((a, b) => b.started_at.localeCompare(a.started_at)), null, 2));
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  const [,, cmd, ...args] = process.argv;

  if (cmd === 'start') {
    const separatorIdx = args.indexOf('--');
    const flowName = args[0];
    const extraArgs = separatorIdx !== -1 ? args.slice(separatorIdx + 1) : [];
    await cmdStart(flowName, extraArgs);
  } else if (cmd === 'status') {
    await cmdStatus(args[0]);
  } else if (cmd === 'step') {
    await cmdStatus(args[0]); // same output, alias
  } else if (cmd === 'advance') {
    await cmdAdvance(args[0]);
  } else if (cmd === 'fail') {
    await cmdFail(args[0], args.slice(1).join(' '));
  } else if (cmd === 'done') {
    await cmdDone(args[0]);
  } else if (cmd === 'list') {
    await cmdList();
  } else {
    console.error('Usage: run-lobster-flow.mjs <start|status|step|advance|fail|done|list> [args]');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`run-lobster-flow fatal: ${err.message}`);
  process.exit(1);
});
