# OpenClaw Runtime Architecture Session Review

Date: 2026-04-18
Scope: `/root/.openclaw` live runtime, `/root/.openclaw/workspace` coordination repo, dispatcher/dashboard/control-plane integration

## Lagebild

The current system is a hybrid OpenClaw runtime with these main layers:

- Live runtime under `/root/.openclaw` with `openclaw.json`, `agents/`, `runtime/`, `logs/`, channel bindings, and specialist workspaces.
- Canonical coordination state under `/root/.openclaw/workspace/operations/`.
- Human control plane in `/root/.openclaw/workspace/engineering/rook-dashboard`.
- Execution path through `operations/bin/task-dispatcher.mjs`, local hooks, and per-agent workspaces.

Observed main control loop:

1. Dashboard creates or edits work.
2. Dashboard sync logic mirrors tasks into canonical JSON under `operations/tasks/`.
3. Dispatcher scans canonical tasks and launches hook-based worker sessions.
4. Runtime overlays and logs are written under `/root/.openclaw/runtime/operations/`.
5. Dashboard reads canonical tasks plus runtime overlays and health snapshots back into the UI.

The architecture intent is coherent, but the operating safety now depends heavily on keeping repo documentation, systemd units, runtime defaults, and contract checks aligned.

## Findings

### 1. Repo-to-live contract drift exists in dispatcher model configuration

- Live `~/.config/systemd/user/rook-dispatcher.service` uses `ROOK_HOOK_MODEL=minimax-portal/MiniMax-M2.7`.
- Repo file `workspace/operations/systemd/rook-dispatcher.service` still used `minimax-portal/MiniMax-M2.5`.
- Multiple operator docs still described `M2.5` as the live stable worker model, while `openclaw.json` now defaults to `minimax/MiniMax-M2.7`.

Impact:

- A routine unit resync from the repo could silently roll the dispatcher back to an outdated model path.
- Upgrade/runbook guidance could reintroduce drift during maintenance.

### 2. Source-of-truth model is conceptually clear, but still operationally fragmented

Verified durable state locations:

- canonical tasks: `workspace/operations/tasks/`
- runtime overlays: `/root/.openclaw/runtime/operations/task-state/`
- archived tasks: `/root/.openclaw/runtime/operations/archive/tasks/`
- health snapshots: `/root/.openclaw/runtime/operations/health/`
- dashboard cache: `engineering/rook-dashboard/data/kanban.db`

This is workable, but only if operators consistently treat runtime overlays and SQLite as reconstructible caches instead of reviewable history.

### 3. Runtime-only and stale state still exists

Diagnostics showed:

- runtime-only task overlays for `rook-agent/agent-0001.json`, `rook-workspace/ops-0014.json`, and `rook-workspace/ops-0034.json`
- stale disk agent directory `agents/main/` not present in `openclaw.json`

Impact:

- recovery and postmortem interpretation remain harder than necessary
- stale runtime debris can blur which agent/task identities are still authoritative

### 4. Multi-agent topology is mostly explicit, but role maturity is uneven

Configured live agents:

- `rook`
- `engineer`
- `researcher`
- `test`
- `review`
- `coach`
- `health`
- `dispatcher`

Observed practical reality:

- `rook` is the orchestration owner
- `engineer` is still the most reliable execution fallback
- `test` and `review` exist as real agents, but the docs still describe them partly as fallback-sensitive stages
- `main` survives on disk as a legacy runtime artifact

### 5. Diagnostics are useful, but distributed

Available checks already cover:

- OpenClaw contract posture
- runtime posture
- runtime/canonical state coverage
- task/agent bindings
- stale agent directories
- runtime-only task overlays

The leverage is good, but findings are split across multiple scripts, so drift can stay hidden unless an operator runs the full set intentionally.

## Actions Taken

Implemented a narrow first repair slice to remove repo-to-live drift for the dispatcher model contract:

- updated `operations/systemd/rook-dispatcher.service` to `minimax-portal/MiniMax-M2.7`
- updated `operations/bin/check-agent-runtime.mjs` default hook model to `minimax-portal/MiniMax-M2.7`
- updated these docs to the current live contract:
  - `docs/OPERATOR-DEVELOPER-MANUAL.md`
  - `docs/LIVE-SYSTEM-BEHAVIOR.md`
  - `docs/OPENCLAW-UPGRADE-GUIDE.md`
  - `docs/RUNTIME-OPERATIONS.md`

Intentionally not changed:

- historical `operations/tasks/*.json` records that still mention older model values
- live `openclaw.json`
- installed user systemd units

## Validation Performed

Read and inspected:

- `AGENTS.md`
- `README.md`
- `docs/SYSTEM-MAP.md`
- `docs/TARGET-ARCHITECTURE.md`
- `docs/SYSTEM-OVERVIEW.md`
- `docs/RUNTIME-OPERATIONS.md`
- `docs/OPENCLAW-UPGRADE-GUIDE.md`
- `operations/README.md`
- `engineering/rook-dashboard/README.md`
- `engineering/rook-dashboard/package.json`
- `engineering/metrics-collector/package.json`
- `operations/bin/task-dispatcher.mjs`
- `operations/bin/check-runtime-posture.mjs`
- `operations/bin/reconcile-runtime-task-state.mjs`
- `operations/bin/check-openclaw-contract.mjs`
- `operations/bin/check-runtime-only-task-state.mjs`
- `operations/bin/check-stale-agent-dirs.mjs`
- `engineering/rook-dashboard/src/lib/control/tasks.ts`
- `engineering/rook-dashboard/src/lib/control/task-sync.ts`
- `engineering/rook-dashboard/src/lib/control/health.ts`
- `engineering/rook-dashboard/src/lib/db.ts`
- relevant dashboard API routes

Executed diagnostics:

- `git status --short --branch` in `workspace/`
- `node operations/bin/check-runtime-posture.mjs`
- `node operations/bin/check-runtime-state-coverage.mjs`
- `node operations/bin/check-task-agent-bindings.mjs`
- `node operations/bin/check-openclaw-contract.mjs`
- `node operations/bin/check-runtime-only-task-state.mjs`
- `node operations/bin/check-stale-agent-dirs.mjs`

Key validated facts:

- live dispatcher user unit already runs `minimax-portal/MiniMax-M2.7`
- repo unit previously lagged behind that live unit
- live `openclaw.json` defaults to `minimax/MiniMax-M2.7`

## Open Risks

- repo task history still contains older model references and may confuse retrospective analysis
- runtime-only overlays and stale `agents/main/` state remain unresolved
- diagnostics remain fragmented across several scripts
- `gateway.controlUi.allowInsecureAuth=true` and `hooks.allowRequestSessionKey=true` are still flagged by posture checks; these may be acceptable locally, but they should remain explicitly documented and periodically reviewed

## Next Steps

1. Add one operator-facing aggregate posture report that includes contract drift, stale agent dirs, runtime-only overlays, and repo-vs-live unit drift in a single output.
2. Decide whether `agents/main/` should be archived, migrated, or explicitly documented as intentional legacy state.
3. Define and document a policy for resolving runtime-only task overlays:
   restore, archive, or prune.
4. Compare repo systemd units against installed user units automatically so future drift is caught before maintenance.
5. Review whether dashboard health should surface these operator warnings directly instead of requiring shell-only diagnostics.
