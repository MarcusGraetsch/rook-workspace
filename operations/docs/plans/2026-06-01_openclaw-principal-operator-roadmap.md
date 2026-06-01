# OpenClaw Principal Operator Roadmap

**Date:** 2026-06-01  
**Scope:** Long-running execution plan for the Hermes + OpenClaw VPS control plane.  
**Purpose:** Keep the remaining work visible across multiple sessions, with a checklist that can be marked done and struck through as items complete.

## How to use this plan

- Keep tasks in order unless a dependency blocks progress.
- When a task is complete, change `- [ ]` to `- [x]` and strike the task text through with `~~...~~`.
- Do not delete completed items. The point is to preserve the operating history.
- Add a short note under any completed item if the result is not obvious from the commit/report trail.

## Baseline already completed

- [x] Rootless `openclaw-gateway` and `openclaw-node` services are live under a dedicated `openclaw` system user.
- [x] Dashboard is rootless under `rook-dashboard`.
- [x] Internal Docker/service exposure was reduced to localhost bindings.
- [x] Cron-backed recurring jobs were migrated to systemd timers.
- [x] Swapfile and memory guardrails were added on the VPS.
- [x] SSH hardening and `fail2ban` were applied.
- [x] `gateway.controlUi.allowInsecureAuth` is disabled.
- [x] `hooks.allowRequestSessionKey` is disabled.
- [x] `voice-call` auto-load warning was removed by disabling the plugin.
- [x] The dashboard polling/render drift fix was deployed and committed.

## Current session progress

- [x] ~~Implement the first dashboard-0050 slice: expand Kanban workflow states to Review/Rework/Human Review/Merging, add canonical task filtering and task update APIs, and render artifacts/retry/child-task state in the dashboard.~~
- [x] ~~Surface retry queue depth and running session counts in the agent health overview, and align the health schema with the emitted snapshot shape.~~

## Target architecture

The simplest architecture that still solves the problem is:

- one VPS
- rootless long-running app services wherever possible
- `systemd` timers for recurring operations
- one canonical source of task/state truth
- dashboard as a projection, not a competing store
- Hermes/OpenClaw separated by an explicit bridge boundary
- dangerous actions guarded by approval and idempotency checks
- localhost-only internal services, external access only through the chosen admin path

## Phase 0: Preconditions and Safety Checks

**Objective:** Make sure every later change is reversible and that we know what state the system is in before touching deeper architecture.

- [ ] Capture a fresh baseline report for the current runtime posture.
- [ ] Record current `git status` for `/root/.openclaw/workspace` and any nested repos in scope.
- [ ] Inventory all live systemd services, timers, and Docker containers that belong to OpenClaw/Hermes.
- [ ] Record current warnings from the control-plane checks and journals.
- [ ] Back up the current `/root/.openclaw/openclaw.json` and any live service unit overrides before changing them.
- [ ] Identify which paths are still owned by root only because of historical layout, not because they genuinely need root.

**Why it matters:** if the remaining architecture work touches state, permissions, or agent privileges, we need a clean rollback point first.

**Dependencies:** none beyond the live host state.

**Validation:** baseline report written, inventory captured, rollback copy available.

**Success criteria:** no ambiguity about the current live shape.

## Phase 1: Critical Same-Day Fixes

**Objective:** Remove the highest-risk remaining friction and ambiguity.

- [x] ~~Resolve the persistent `tasks/registry` restore warning by identifying the real source of truth for task state.~~ The live `tasks/registry` restore failure now resolves to `null`; the task registry store is healthy and the flow registry is backed up, restored, and integrity-checked.
- [x] ~~Decide whether `tasks/registry` is canonical, derived, or legacy noise that should be removed.~~ The task registry is the live SQLite-backed task store under `~/.openclaw/tasks/runs.sqlite`; the flow registry is separate under `~/.openclaw/flows/registry.sqlite` and is now explicitly covered by backup/restore and control-plane checks.
- [x] ~~Write the agent permission matrix for `rook`, `dispatcher`, the bridge, and any operator-facing agent.~~
- [x] ~~Separate planner permissions from executor permissions so dangerous actions do not share the same default tool surface.~~
- [x] ~~Make the approval gate explicit for any action that restarts services, rewrites config, or sends outbound messages.~~ Added `approval-gates` policy entries and wired the gate into restart, config rewrite, and outbound notification paths.
- [ ] Audit `/root/.openclaw/openclaw.json` for any remaining insecure defaults, fallback allow modes, or ambiguous routing rules.

**Why it matters:** these are the places where the system can still silently do the wrong thing or hide the real source of failure.

**Dependencies:** Phase 0 baseline and inventory.

**Rollback concerns:** config changes can break agent routing or service startup; keep a snapshot of the previous config and unit files.

**Validation:** run the relevant control-plane checks, restart the affected services once, and confirm the warning actually disappears rather than being filtered out.

**Success criteria:** no unexplained registry warning, and the agent permission model is documented and enforced.

## Phase 2: Stabilization This Week

**Objective:** Make the current runtime predictable enough that operators do not need to infer behavior from logs.

- [ ] Define one canonical source of truth for task state and queue state.
- [ ] Make dashboard state a projection of that truth, not a second write path.
- [ ] Add explicit lease/lock behavior to any recurring job that can overlap or duplicate work.
- [ ] Add timeout and retry policy per job class instead of relying on ad hoc shell behavior.
- [ ] Expand the control-plane checks to cover queue freshness, registry health, and agent capability drift.
- [ ] Tighten ACLs and ownership in `/root/.openclaw` so root is not the default trust boundary for everything.
- [ ] Add or update operator runbooks for registry failures, queue stalls, and service restart failures.
- [ ] Surface backup freshness and service health in one place that is easy to scan.

**Why it matters:** this is the work that makes the system boring to run.

**Dependencies:** Phase 1 decisions on canonical state and agent boundaries.

**Rollback concerns:** state model changes can create mismatches between live services and dashboard assumptions; keep the old projection path until the new one is proven.

**Validation:** restart the services, re-run the control-plane checks, and confirm the dashboard and runtime agree on task state.

**Success criteria:** no duplicate work, no hidden queue stalls, and one readable health picture.

## Phase 3: Structural Improvements This Month

**Objective:** Reduce long-term complexity and make future changes less fragile.

- [ ] Formalize the planner/executor pattern in the code and docs.
- [ ] Split message routing, task execution, and UI projection into explicit boundaries.
- [ ] Introduce idempotency keys or equivalent replay guards for dangerous agent actions.
- [ ] Add drift checks for local OpenClaw customizations versus upstream-compatible behavior.
- [ ] Document the state layout: what is live, what is derived, what is archival.
- [ ] Simplify any duplicated state paths that exist only because of historical growth.
- [ ] Add a concise incident response checklist for common failure modes.

**Why it matters:** the system is already operational; this phase makes it maintainable through upgrades and turnover.

**Dependencies:** Phase 2 stabilization.

**Rollback concerns:** structural refactors can create new state assumptions; do them one boundary at a time.

**Validation:** compare old and new behavior on one representative workflow before widening the change.

**Success criteria:** simpler state flow, clearer agent roles, and fewer upgrade surprises.

## Phase 4: Optional Strategic Redesign

**Objective:** Consider deeper redesigns only if the earlier phases still leave unresolved architectural pressure.

- [ ] Evaluate whether `/root/.openclaw` should remain the long-term state root or whether a service-owned state root is worth the migration cost.
- [ ] Consider whether Hermes should keep its current bridge shape or move to a stricter event-driven contract.
- [ ] Decide whether a small internal database is justified for the canonical state, or whether JSON plus strict conventions is enough.
- [ ] Consider external observability if local journald + dashboard is no longer sufficient.
- [ ] Reassess whether any currently local-only components should become separate services or separate hosts.

**Why it matters:** these are the options if the simpler architecture still hits a ceiling.

**Dependencies:** completion of Phases 1 to 3, plus evidence that the simpler architecture is still not enough.

**Rollback concerns:** redesign work can create migration debt quickly; only do it with a written migration plan.

**Validation:** insist on a concrete before/after workflow, not just a cleaner diagram.

**Success criteria:** lower cognitive load without adding a second complex system.

## Execution order for future sessions

1. Phase 0 baseline refresh.
2. Phase 1 `tasks/registry` and permission boundary work.
3. Phase 2 canonical state and queue/lease stabilization.
4. Phase 3 planner/executor and drift hardening.
5. Phase 4 only if a hard architectural limit remains.

## Scratch-out convention

For every completed task:

1. Change `- [ ]` to `- [x]`.
2. Strike through the task text with `~~...~~`.
3. Add a short completion note only if the result is not obvious from the commit or report filename.
