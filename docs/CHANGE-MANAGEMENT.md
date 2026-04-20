# Change Management

This system should not be merged by intuition.

The runtime is now strong enough that uncontrolled merges are one of the main remaining risks.

## Current Rule

For multi-file runtime changes, use:

1. branch
2. compare against `main`
3. open a PR
4. review scope and risk
5. merge only after the compare looks intentional

Do not merge long-running repair branches directly without a compare step.

## Why

The Rook runtime is not just application code.

A single branch can now affect:

- OpenClaw runtime behavior
- dashboard uptime
- dispatcher execution
- canonical task truth
- GitHub workflow automation
- upgrade safety

That means a direct merge can accidentally bundle:

- runtime fixes
- docs
- task-state normalization
- temporary fallback logic
- unrelated local drift

## What To Compare Before Merge

At minimum, compare:

- `operations/bin/`
- `operations/systemd/`
- `operations/tasks/`
- `.github/workflows/`
- `docs/`
- `openclaw.json` live contract expectations
- `git submodule status`
- `engineering/rook-dashboard` pointer versus the actually deployed dashboard revision

Questions to answer:

- Does this branch change execution behavior?
- Does it change supervision or restart behavior?
- Does it change task truth or only documentation?
- Does it contain temporary fallback logic that should stay temporary?
- Does it include task-state snapshots that should not become permanent history?
- Does it move a submodule pointer to a commit that exists only locally?

## Practical Merge Policy

Use a PR by default for:

- dispatcher changes
- dashboard supervision changes
- hook/runtime changes
- task schema changes
- GitHub workflow changes
- upgrade-contract changes

Direct merge is acceptable only for narrow, obvious, low-risk changes such as:

- typo-only docs
- isolated non-runtime markdown updates
- trivial comments

## Branch Lifetime Policy

Agent branches should be short-lived.

Default rule:

1. open a focused branch for one coherent change
2. open the PR quickly
3. merge as soon as the diff is intentional and checks are acceptable
4. delete the remote branch immediately after merge

Do not keep absorbed branches around once `main` contains the work.

Submodule rule:

1. if the superproject points at a submodule commit, that commit must be reachable on the intended remote before merge
2. if the deployed dashboard revision changed locally, either push that dashboard commit first or do not advance the superproject pointer yet

If a branch is:

- already fully contained in `main`
- no longer ahead of `main`
- not needed for active review

then it should be deleted instead of preserved.

The goal is to prevent:

- stale agent branches that look unresolved
- confusion about what is actually still pending
- accidental work on an already-absorbed branch
- human uncertainty about whether a ticket is really complete

The repository should show active work, not archaeological layers of already-merged agent branches.

## Current Branch Situation

The current stabilization branch is broad.

It contains:

- dispatcher hardening
- dashboard supervision
- runtime smoke checks
- task-state normalization
- test-agent and review-agent setup artifacts
- operational documentation

That is exactly the kind of branch that should be reviewed through a compare and PR flow before merge.

## Recommended Workflow From Here

1. Run a compare from the working branch to `main`.
2. Open a draft PR with a clear summary of:
   - runtime/control-loop fixes
   - dashboard supervision changes
   - test/review pipeline changes
   - documentation and upgrade-contract additions
3. Review whether any canonical task JSON files should be excluded or split later.
4. Merge only when the PR description matches the diff.
