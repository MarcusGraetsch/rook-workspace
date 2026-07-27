---
name: staged-coding-pipeline-openclaw
description: Run a staged multi-agent coding pipeline.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧭","requires":{"bins":["git","python3"]}}}
---

# Staged coding pipeline for OpenClaw

Use this skill for one difficult coding task that:

- spans multiple files;
- has meaningful integration risk;
- can plausibly split into independent work packages;
- lives in a Git repository.

Do not use it for a single-file edit, a direct question, or pure diagnosis without an implementation mandate.

Load `evidence-driven-method` first when available.

## Platform facts

Use:

- `sessions_spawn` to start isolated workers;
- `sessions_yield` to wait for required completion events;
- `subagents` only for on-demand diagnostics or cancellation;
- explicit `cwd` values for repository and worktree isolation;
- per-spawn `model` and `thinking` values only when they are configured and valid.

Never poll in a loop. Spawn once and use `sessions_yield`.

Read `{baseDir}/references/model-map.md`. Treat blank model fields as “inherit configured default”; never invent a model ID.

Manual worktrees from `{baseDir}/scripts/` are the default because they work for non-visible runs and keep package paths explicit.

## Stage 0 — classify and contract

State:

```text
Task type: build | diagnose
Pipeline decision: use | do not use
Repository:
Completion condition:
Proof:
Forbidden actions:
```

Diagnosis without requested implementation stays read-only. Use exploration agents only if needed.

Optionally create an OpenClaw session goal containing the measurable whole-task completion condition when the user explicitly wants durable goal tracking. A goal is not a background workflow or task queue.

## Stage 1 — preflight

Run:

```bash
{baseDir}/scripts/preflight.sh <repo>
```

Stop before fan-out when relevant files have uncommitted changes that children would not safely share.

Do not stash, commit, reset or discard user work without explicit approval.

Create a task register from:

```text
{baseDir}/templates/task-register.md
```

Record starting branch and SHA.

Confirm the effective tool list contains:

```text
sessions_spawn
sessions_yield
subagents
```

## Stage 2 — explore

Choose 2–4 independent read-only angles:

- architecture and repository conventions;
- callers, dependencies and integration boundaries;
- tests and verification;
- operational or security risks.

For every angle call `sessions_spawn` with:

- unique `taskName`, such as `explore_architecture`;
- `context: "isolated"`;
- absolute repository `cwd`;
- a self-contained task;
- explorer model and thinking from `model-map.md`, when configured;
- `cleanup: "keep"` until evidence is reviewed.

The task must contain:

- original task;
- assigned angle;
- read-only prohibition;
- template path;
- unique report output path;
- `path:line` evidence requirement;
- no large source dumps.

Use `{baseDir}/templates/explore-brief.md`.

After spawning all required explorers, call `sessions_yield`. Do not use polling loops.

When completion events arrive:

1. verify each report path with `test -s`;
2. inspect contradictions;
3. continue only when all required briefs exist.

A completion announcement is evidence to inspect, not permission to trust the claim.

## Stage 3 — plan in the coordinator

Synthesize the exploration briefs.

Create 1–4 packages. Fewer packages are better than false parallelism.

Every package needs:

- measurable outcome;
- exact file ownership;
- constraints;
- one check command;
- expected result;
- package report path.

Parallel packages must have disjoint write sets. If they share files or fixed runtime resources, serialize them.

Create worktrees:

```bash
{baseDir}/scripts/create-worktree.sh <repo> <package-name> <base-ref>
```

Create package briefs from:

```text
{baseDir}/templates/package-brief.md
```

Verify every brief is non-empty before implementation fan-out.

## Stage 4 — implement

For each independent package call `sessions_spawn` with:

- unique `taskName`, such as `implement_auth`;
- `context: "isolated"`;
- `cwd` set to the assigned worktree;
- implementer model and thinking from `model-map.md`, when configured;
- a complete, self-contained task;
- `cleanup: "keep"`.

The task must include:

- worktree and branch;
- base SHA;
- full package brief;
- exact allowed files;
- check command;
- report path;
- prohibition on push, deploy, force, reset, deletion and unrelated refactoring.

The worker must:

1. modify only its package files;
2. implement the outcome;
3. run the required check;
4. run the scope checker;
5. commit its package branch;
6. write the report.

Scope command:

```bash
{baseDir}/scripts/scope-check.sh <worktree> <base-ref> <allowed-glob>...
```

After all spawns, call `sessions_yield`.

For each completion:

```bash
test -s <package-report>
{baseDir}/scripts/verify-package.sh <worktree> '<check-command>' <check-report>
```

Never accept “done” without the artifact and real command output.

## Stage 5 — merge

Merge only verified package branches.

Run:

```bash
{baseDir}/scripts/merge-packages.sh \
  <repo> <integration-name> <base-ref> <branch>...
```

A substantive merge conflict is a stop condition for automatic integration. Do not guess.

Record integration worktree, branch and SHA. Run the whole-task completion check.

## Stage 6 — review

Spawn 2–3 isolated, read-only reviewers:

1. plan conformance;
2. correctness and edge cases;
3. regressions and project test suite.

For every reviewer use:

- unique `taskName`;
- integration worktree as `cwd`;
- reviewer model and thinking from `model-map.md`;
- `context: "isolated"`;
- review template path;
- unique report path;
- explicit read-only instruction.

Use `{baseDir}/templates/review-report.md`.

Capture the integration SHA and working-tree status before review. After review, verify the integration worktree did not change. Any reviewer write is a finding and must be inspected.

After spawning all reviewers, call `sessions_yield`.

Verify each report exists and rerun critical checks independently.

## Stage 7 — bounded fix loop

For blocker findings and selected major findings:

- create correction packages in the integration worktree;
- run at most two fix rounds;
- rerun affected checks;
- rerun the whole completion check;
- request targeted re-review.

Do not spend further rounds on cosmetic minor findings unless explicitly requested.

## Stage 8 — finish

Completion requires:

- observable completion condition;
- all checks with real output;
- no unresolved blocker;
- clean scope verification;
- remaining risks stated;
- user-owned decisions listed.

Commit, push or open a PR only when requested.

Worktree cleanup is a separate approval gate.

Dry-run:

```bash
{baseDir}/scripts/cleanup-worktrees.sh <repo>
```

After explicit approval:

```bash
{baseDir}/scripts/cleanup-worktrees.sh <repo> --apply
```

## Final report

Lead with the outcome.

Include:

- completion evidence;
- branches and SHAs;
- files changed;
- checks and exit codes;
- review findings and fix rounds;
- remaining risks;
- deliberately untouched items;
- actions still requiring approval.
