import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { classifyTask, routeTask } from '../bin/adaptive-router.mjs';

const policy = JSON.parse(await readFile(new URL('../config/adaptive-routing-policy.json', import.meta.url), 'utf8'));

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
