import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { classifyTask, routeTask } from '../bin/adaptive-router.mjs';
import { buildRoutingText, observeRouting } from '../bin/dispatcher/routing-shadow.mjs';
import { summarizeRoutingRecords } from '../bin/routing-report.mjs';

const policyUrl = new URL('../config/adaptive-routing-policy.json', import.meta.url);
const policy = JSON.parse(await readFile(policyUrl, 'utf8'));

test('classifies repository implementation as coding', () => {
  const profile = classifyTask('Implementiere das Feature im Repository und schreibe Tests.');
  assert.equal(profile.task_type, 'coding');
});

test('explicit user backend choice wins', () => {
  const decision = routeTask('Bitte nutze Claude und reviewe diese Architektur gründlich.', policy);
  assert.equal(decision.recommended_backend, 'claude');
  assert.equal(decision.reason, 'explicit user choice');
});

test('standard coding prefers Codex from included subscriptions', () => {
  const decision = routeTask('Implementiere eine kleine neue Funktion im Repo und schreibe Tests.', policy);
  assert.equal(decision.profile.task_type, 'coding');
  assert.equal(decision.recommended_backend, 'codex');
  assert.equal(decision.extra_cost_policy.allowed, false);
});

test('complex architecture prefers Claude and asks for independent review', () => {
  const decision = routeTask('Entwirf eine komplexe Zielarchitektur für mehrere Repositories und bewerte langfristige Trade-offs sehr gründlich.', policy);
  assert.equal(decision.profile.task_type, 'architecture');
  assert.equal(decision.profile.complexity, 'complex');
  assert.equal(decision.recommended_backend, 'claude');
  assert.ok(decision.reviewer);
  assert.notEqual(decision.reviewer, 'claude');
});

test('high-risk production operation uses operations workflow and independent review', () => {
  const decision = routeTask('Plane ein Kubernetes Deployment in der produktiven Kundenumgebung und prüfe die Änderung.', policy);
  assert.equal(decision.profile.task_type, 'operations');
  assert.equal(decision.profile.risk, 'high');
  assert.equal(decision.workflow, 'operations');
  assert.ok(decision.reviewer);
});

test('additional cost stays disabled unless explicitly allowed', () => {
  const defaultDecision = routeTask('Recherchiere aktuelle Optionen gründlich.', policy);
  assert.equal(defaultDecision.extra_cost_policy.allowed, false);
  assert.equal(defaultDecision.extra_cost_policy.max_eur, 0);

  const allowedDecision = routeTask('Recherchiere aktuelle Optionen. Zusätzliche Kosten erlaubt, Budget 2,50 Euro.', policy);
  assert.equal(allowedDecision.extra_cost_policy.allowed, true);
  assert.equal(allowedDecision.extra_cost_policy.max_eur, 2.5);
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
