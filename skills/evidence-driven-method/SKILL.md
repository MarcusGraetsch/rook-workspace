---
name: evidence-driven-method
description: Verify hard tasks through evidence and bounded change.
---

# Evidence-driven method

Use this protocol for difficult, ambiguous or multi-step work where a plausible-looking answer can still be wrong.

Do not load the full protocol for a trivial edit or direct factual reply.

## 1. Establish the contract

Before changing anything, state:

1. **Outcome** — what observable result must exist.
2. **Proof** — which command, behavior, output or comparison proves it.
3. **Scope** — what may change and what must remain untouched.
4. **Assumptions** — every interpretation that could materially alter the solution.
5. **Risk gates** — actions that require explicit approval.

Convert vague requests into measurable conditions.

Examples:

```text
"Fix the bug"
→ A test reproduces the bug before the change and passes afterward.

"Add feature X"
→ Flow Y produces observable result Z and neighboring tests remain green.

"Analyze the repository"
→ Produce a cited map of relevant components; do not edit files.
```

Honor the exact verb. Analyze is not implement. Commit is not push. Prepare is not deploy.

Resolve repository and system facts with tools. Ask the user only about decisions that genuinely belong to them.

## 2. Map before planning

Read the minimum evidence needed to find:

- load-bearing unknowns;
- external contracts;
- existing mechanisms to extend;
- ownership and blast radius;
- integration boundaries;
- likely verification channels.

Attack the assumption most capable of killing the plan first.

Prefer:

- a thin end-to-end slice over layer-by-layer construction;
- one verified exemplar before N similar artifacts;
- an existing repository mechanism over parallel infrastructure;
- deterministic extraction before LLM interpretation.

Keep the initial plan to 3–7 revisable steps. Each step needs its own check.

## 3. Execute as a control loop

For each meaningful action:

1. **Predict** the expected result.
2. **Act** with the smallest reversible step.
3. **Observe** the real output.
4. **Compare** observation with prediction.
5. **Continue or revise** based on evidence.

A surprise means the current model of the system is incomplete. Stop and explain it before continuing.

After two failures of the same kind, the next attempt must differ in kind:

- another tool;
- another system layer;
- another hypothesis;
- execution instead of static reading;
- a smaller reproduction.

Never repeat a failed command merely to create the appearance of progress.

## 4. Verify adversarially

Verify behavior, not appearance.

Good evidence:

- a targeted test;
- a real end-to-end flow;
- an observed HTTP response;
- a runtime log line;
- a linter or type checker;
- an independent reviewer;
- an actual remote SHA or artifact hash.

Weak evidence:

- “the diff looks right”;
- an exit code from the wrong environment;
- a green test against stale artifacts;
- a file path reported by an agent but not checked;
- “it worked before”;
- an empty response treated as a semantic zero.

For every change, also perform negative verification:

- inspect diff scope;
- check what must not have changed;
- run neighboring tests;
- test one positive and one negative case;
- verify every declared artifact path exists and is non-empty.

Before accepting an agent result, inspect the artifact or rerun the check independently.

## 5. Delegate by evidence boundaries

Delegate only when the task contains independent work or excessive reading.

Use deterministic tools for mechanical work:

```text
counting, filtering, extraction, bulk replacement, schema checking
```

Use agents for:

```text
judgment, interpretation, planning, implementation, review, synthesis
```

Every delegated brief must contain:

- mandatory context and paths;
- exact scope;
- explicit prohibitions;
- required output format;
- verification command;
- anti-drift rule;
- anti-duplication rule for resumed work.

Keep planning, synthesis, irreversible gates and final verification with the coordinator.

Disjoint packages should own disjoint files. If that is impossible, run them sequentially.

Contradictions between agents are findings. Resolve them; do not average them away.

## 6. Protect state

Before risky writes:

- identify the owner and environment;
- inspect current branch and uncommitted work;
- create a reversible checkpoint;
- prefer dry-run;
- constrain the write set;
- verify state has not changed since it was read.

Do not automatically:

- push;
- deploy;
- delete;
- force;
- reset;
- discard uncommitted work;
- clean worktrees;
- modify production data.

Explicit user authorization is required for hard-to-reverse actions.

## 7. Choose the next action

Prefer the action with the highest information value per cost, weighted toward actions that can invalidate the plan.

Priority:

1. Verify an assumption supporting all later steps.
2. Explain a surprising result.
3. Test the cheapest discriminating hypothesis.
4. Resolve ownership before touching a resource.
5. Continue the current plan when evidence still supports it.

The goal is fixed. The plan is disposable.

## 8. Stop conditions

Stop only when:

1. the completion condition has been observed;
2. a genuine user-owned decision blocks safe progress;
3. evidence shows the requested task is materially different from reality.

Do not stop because of:

- tedium;
- long context;
- a failed first approach;
- an answer obtainable with tools;
- an untested assumption.

Report partial completion precisely. Never round “implemented but not verified” up to “done”.

## 9. Communication

During substantial work:

- announce the immediate action in one or two sentences;
- report concrete completed evidence;
- keep updates short;
- state reversals plainly when evidence changes the conclusion.

The final report starts with the outcome and then gives:

1. checks performed and real results;
2. files or systems changed;
3. remaining risks;
4. deliberately untouched items;
5. decisions requiring the user.

Long raw reports belong in files; the conversation gets the synthesis and paths.

## 10. Calibration

| Task shape | Apply |
|---|---|
| Multi-file change, unfamiliar code, ambiguous specification, integration risk | Full protocol |
| Small nontrivial change in known code | Contract + adversarial verification |
| Direct question or trivial edit | Skip the protocol |

Protocol overhead is also a failure mode.
