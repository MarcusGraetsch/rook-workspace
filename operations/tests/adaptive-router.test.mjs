import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { classifyTask, routeTask } from '../bin/adaptive-router.mjs';
import { collectBackendAvailability } from '../bin/routing-availability.mjs';
import { buildRoutingText, observeRouting } from '../bin/dispatcher/routing-shadow.mjs';
import { summarizeRoutingRecords } from '../bin/routing-report.mjs';
import {
  classifyOutcome,
  correlateRoutingOutcomes,
  normalizeActualBackend,
  summarizeOutcomes,
} from '../bin/routing-outcomes.mjs';

const policyUrl = new URL('../config/adaptive-routing-policy.json', import.meta.url);
const policy = JSON.parse(await readFile(policyUrl, 'utf8'));

const injectedAvailable = {
  checked_at: '2026-08-14T13:00:00.000Z',
  model_mode: { active_mode: 'default', effective_model: 'kimi-coding/moonshot-k2-6' },
  backends: {
    kimi: { status: 'available', available: true, dispatcher_executable: true, interaction: 'openclaw' },
    minimax: { status: 'available', available: true, dispatcher_executable: true, interaction: 'openclaw' },
    codex: { status: 'available', available: true, dispatcher_executable: false, interaction: 'manual-cli' },
    claude: { status: 'available', available: true, dispatcher_executable: false, interaction: 'manual-cli' },
  },
};

test('classifies repository implementation as coding', () => {
  const profile = classifyTask('Implementiere das Feature im Repository und schreibe Tests.');
  assert.equal(profile.task_type, 'coding');
});

test('explicit user backend choice wins', () => {
  const decision = routeTask('Bitte nutze Claude und reviewe diese Architektur gründlich.', policy, injectedAvailable);
  assert.equal(decision.recommended_backend, 'claude');
  assert.equal(decision.reason, 'explicit user choice');
  assert.equal(decision.execution.manual_handoff_required, true);
});

test('standard coding prefers Codex from included subscriptions', () => {
  const decision = routeTask('Implementiere eine kleine neue Funktion im Repo und schreibe Tests.', policy, injectedAvailable);
  assert.equal(decision.profile.task_type, 'coding');
  assert.equal(decision.recommended_backend, 'codex');
  assert.equal(decision.extra_cost_policy.allowed, false);
  assert.equal(decision.execution.recommended_dispatcher_executable, false);
  assert.equal(decision.execution.dispatcher_candidate, 'kimi');
});

test('complex architecture prefers Claude and asks for independent review', () => {
  const decision = routeTask('Entwirf eine komplexe Zielarchitektur für mehrere Repositories und bewerte langfristige Trade-offs sehr gründlich.', policy, injectedAvailable);
  assert.equal(decision.profile.task_type, 'architecture');
  assert.equal(decision.profile.complexity, 'complex');
  assert.equal(decision.recommended_backend, 'claude');
  assert.ok(decision.reviewer);
  assert.notEqual(decision.reviewer, 'claude');
});

test('high-risk production operation uses operations workflow and independent review', () => {
  const decision = routeTask('Plane ein Kubernetes Deployment in der produktiven Kundenumgebung und prüfe die Änderung.', policy, injectedAvailable);
  assert.equal(decision.profile.task_type, 'operations');
  assert.equal(decision.profile.risk, 'high');
  assert.equal(decision.workflow, 'operations');
  assert.ok(decision.reviewer);
});

test('additional cost stays disabled unless explicitly allowed', () => {
  const defaultDecision = routeTask('Recherchiere aktuelle Optionen gründlich.', policy, injectedAvailable);
  assert.equal(defaultDecision.extra_cost_policy.allowed, false);
  assert.equal(defaultDecision.extra_cost_policy.max_eur, 0);

  const allowedDecision = routeTask('Recherchiere aktuelle Optionen. Zusätzliche Kosten erlaubt, Budget 2,50 Euro.', policy, injectedAvailable);
  assert.equal(allowedDecision.extra_cost_policy.allowed, true);
  assert.equal(allowedDecision.extra_cost_policy.max_eur, 2.5);
});

test('availability probe maps model-mode fallback and CLI presence without consuming model quota', async () => {
  const snapshot = await collectBackendAvailability(policy, {
    nowIso: '2026-08-14T13:00:00.000Z',
    modelModeState: {
      updated_at: '2026-08-14T12:59:00.000Z',
      active_mode: 'fallback',
      effective_model: 'minimax/MiniMax-M2.7',
      reason: 'limit exceeded',
    },
    cliAvailability: {
      codex: { available: true, status: 'available', reason: 'codex installed' },
      claude: { available: true, status: 'available', reason: 'claude installed' },
    },
  });

  assert.equal(snapshot.backends.kimi.status, 'degraded');
  assert.equal(snapshot.backends.kimi.available, false);
  assert.equal(snapshot.backends.minimax.status, 'available');
  assert.equal(snapshot.backends.minimax.dispatcher_executable, true);
  assert.equal(snapshot.backends.codex.status, 'available');
  assert.equal(snapshot.backends.codex.dispatcher_executable, false);
  assert.equal(snapshot.backends.claude.interaction, 'manual-cli');
});

test('fallback state keeps Codex as expert recommendation but selects MiniMax for autonomous dispatch', async () => {
  const snapshot = await collectBackendAvailability(policy, {
    modelModeState: {
      active_mode: 'fallback',
      effective_model: 'minimax/MiniMax-M2.7',
      reason: 'Kimi quota near limit',
    },
    cliAvailability: {
      codex: { available: true },
      claude: { available: true },
    },
  });

  const decision = routeTask('Implementiere eine kleine Funktion im Repo und schreibe Tests.', policy, snapshot);
  assert.equal(decision.recommended_backend, 'codex');
  assert.equal(decision.execution.manual_handoff_required, true);
  assert.equal(decision.execution.dispatcher_candidate, 'minimax');
});

test('degraded Kimi is not recommended for ordinary conversation when MiniMax is available', async () => {
  const snapshot = await collectBackendAvailability(policy, {
    modelModeState: {
      active_mode: 'fallback',
      effective_model: 'minimax/MiniMax-M2.7',
      reason: 'limit exceeded',
    },
    cliAvailability: {
      codex: { available: false, status: 'unavailable' },
      claude: { available: true, status: 'available' },
    },
  });

  const decision = routeTask('Sag mir kurz den Status.', policy, snapshot);
  assert.equal(decision.profile.task_type, 'conversation');
  assert.equal(decision.recommended_backend, 'minimax');
  assert.equal(decision.execution.dispatcher_candidate, 'minimax');
});

test('shadow observer builds task context and writes a non-invasive routing record', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rook-routing-shadow-'));
  const logPath = path.join(dir, 'routing.jsonl');
  const task = {
    task_id: 'ops-9999',
    project_id: 'ops',
    title: 'Kubernetes Deployment prüfen',
    description: 'Prüfe die produktive Kundenumgebung und ändere noch nichts.',
    status: 'ready',
    assigned_agent: 'engineer',
    source_channel: 'telegram:rook',
    intake: {
      brief: 'Deployment-Risiken erkennen',
      refinement_summary: 'Read-only Analyse vor jeder Änderung',
    },
    checklist: [{ title: 'Manifest prüfen', completed: false }],
    related_repo: 'MarcusGraetsch/example',
  };

  try {
    const text = buildRoutingText(task);
    assert.match(text, /Kubernetes Deployment/);
    assert.match(text, /Manifest prüfen/);
    assert.match(text, /Assigned agent: engineer/);

    const result = await observeRouting(task, {
      policyPath: policyUrl,
      logPath,
      sourceChannel: 'telegram:rook',
      nowIso: '2026-08-14T12:00:00.000Z',
      availability: injectedAvailable,
    });

    assert.equal(result.enabled, true);
    assert.equal(result.decision.profile.task_type, 'operations');

    const records = (await readFile(logPath, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(records.length, 1);
    assert.equal(records[0].kind, 'dispatch-shadow');
    assert.equal(records[0].task_id, 'ops-9999');
    assert.equal(records[0].source_channel, 'telegram:rook');
    assert.equal(records[0].assigned_agent, 'engineer');
    assert.ok(records[0].recommended_backend);
    assert.ok(records[0].execution.dispatcher_candidate);
    assert.equal(records[0].availability.codex.dispatcher_executable, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('routing report summarizes shadow observations without mixing advisory CLI records', () => {
  const summary = summarizeRoutingRecords([
    {
      timestamp: '2026-08-14T12:00:00.000Z',
      kind: 'dispatch-shadow',
      recommended_backend: 'codex',
      reviewer: 'claude',
      workflow: 'code-high-risk',
      assigned_agent: 'engineer',
      profile: { task_type: 'coding', risk: 'high', complexity: 'complex' },
      extra_cost_policy: { allowed: false },
    },
    {
      timestamp: '2026-08-14T12:05:00.000Z',
      kind: 'dispatch-shadow',
      recommended_backend: 'claude',
      reviewer: null,
      workflow: 'research',
      assigned_agent: 'researcher',
      profile: { task_type: 'research', risk: 'medium', complexity: 'standard' },
      extra_cost_policy: { allowed: true },
    },
    {
      timestamp: '2026-08-14T12:10:00.000Z',
      recommended_backend: 'kimi',
      profile: { task_type: 'conversation' },
    },
  ]);

  assert.equal(summary.total_records, 3);
  assert.equal(summary.dispatch_shadow_records, 2);
  assert.equal(summary.by_backend.codex, 1);
  assert.equal(summary.by_backend.claude, 1);
  assert.equal(summary.by_task_type.coding, 1);
  assert.equal(summary.by_task_type.research, 1);
  assert.equal(summary.high_risk, 1);
  assert.equal(summary.complex, 1);
  assert.equal(summary.extra_cost_allowed, 1);
});

test('outcome correlation reuses canonical task state as experience data', () => {
  assert.equal(normalizeActualBackend('minimax-portal/MiniMax-M2.7'), 'minimax');
  assert.equal(normalizeActualBackend('kimi-coding/moonshot-k2-6'), 'kimi');
  assert.equal(normalizeActualBackend('anthropic/claude-sonnet-5'), 'claude');
  assert.equal(normalizeActualBackend('openai/gpt-5.6'), 'codex');
  assert.equal(classifyOutcome({ status: 'done' }), 'success');
  assert.equal(classifyOutcome({ status: 'blocked' }), 'failure');

  const records = [
    {
      timestamp: '2026-08-14T12:00:00.000Z',
      kind: 'dispatch-shadow',
      task_id: 'ops-1000',
      recommended_backend: 'codex',
      reviewer: 'claude',
      workflow: 'code-standard',
      assigned_agent: 'engineer',
      profile: { task_type: 'coding', risk: 'medium', complexity: 'standard' },
    },
    {
      timestamp: '2026-08-14T12:01:00.000Z',
      kind: 'dispatch-shadow',
      task_id: 'ops-1001',
      recommended_backend: 'claude',
      workflow: 'architecture',
      assigned_agent: 'consultant',
      profile: { task_type: 'architecture', risk: 'high', complexity: 'complex' },
    },
  ];
  const tasks = new Map([
    ['ops-1000', {
      task_id: 'ops-1000',
      status: 'done',
      dispatch: { model: 'openai/gpt-5.6', executor: 'engineer', attempts: 1, last_result: 'completed' },
      timestamps: { completed_at: '2026-08-14T12:30:00.000Z' },
    }],
    ['ops-1001', {
      task_id: 'ops-1001',
      status: 'blocked',
      dispatch: { model: 'minimax/MiniMax-M2.7', executor: 'consultant', attempts: 2, last_result: 'aborted' },
      failure_reason: 'test failure',
    }],
  ]);

  const rows = correlateRoutingOutcomes(records, tasks);
  assert.equal(rows[0].outcome, 'success');
  assert.equal(rows[0].recommendation_match, true);
  assert.equal(rows[1].outcome, 'failure');
  assert.equal(rows[1].actual_backend, 'minimax');
  assert.equal(rows[1].recommendation_match, false);

  const summary = summarizeOutcomes(rows);
  assert.equal(summary.correlated, 2);
  assert.equal(summary.successes, 1);
  assert.equal(summary.failures, 1);
  assert.equal(summary.recommendation_matches, 1);
  assert.equal(summary.recommendation_mismatches, 1);
  assert.equal(summary.recommendation_match_rate, 0.5);
});
