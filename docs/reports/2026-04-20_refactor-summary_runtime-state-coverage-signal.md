# Runtime State Coverage Signal Cleanup

Date: 2026-04-20
Scope: `workspace/operations` diagnostics and runtime-state reconciliation

## Findings

- `check-runtime-state-coverage.mjs` treated every canonical task as if it required a live runtime overlay.
- That conflicted with the documented operating model: runtime task-state files are mutable execution overlays and are intentionally cleared when tasks reach `done`.
- The false-positive case was visible in the control-plane checks through missing runtime coverage for completed tasks such as `ops-0046` and `ops-0048`.
- `reconcile-runtime-task-state.mjs` had the same assumption and would have recreated overlays for tasks that should remain overlay-free after completion.

## Actions Taken

- Added a shared runtime-signal heuristic to the affected scripts.
- Runtime overlays are now considered required only for:
  - active execution states: `in_progress`, `testing`, `review`, `blocked`
  - other tasks that still carry real runtime evidence such as `claimed_by`, `last_heartbeat`, `failure_reason`, or populated `dispatch` metadata
- Updated:
  - `operations/bin/check-runtime-state-coverage.mjs`
  - `operations/bin/check-runtime-control-plane.mjs`
  - `operations/bin/reconcile-runtime-task-state.mjs`
- Narrowed `runtime_state_coverage` warnings so they only fire for missing required overlays, not for runtime-only residue that is already covered by `runtime_only_task_state`.

## Validation

- `node operations/bin/check-runtime-state-coverage.mjs`
  - result: `warning_count: 0`
- `node operations/bin/reconcile-runtime-task-state.mjs`
  - result: `action_count: 0`
- `node operations/bin/check-runtime-control-plane.mjs`
  - result: `runtime_state_coverage.warning_count: 0`
- Reviewed the resulting diff for the three changed scripts.

## Open Risks

- The environment still has extensive `runtime_only_task_state` findings; those were not changed here and remain operator work.
- `agents/main` is still an unbound stale runtime directory with active blockers.
- The dispatcher hook model warning remains noisy and should be revisited separately.

## Next Steps

1. Decide whether `runtime_only_task_state` findings should be auto-triaged further by status/age so the control-plane report becomes shorter and more actionable.
2. Resolve or archive the stale `agents/main` directory after clearing active references.
3. Revisit the hook-model warning so the check reflects the real accepted contract instead of a drift heuristic that may now be outdated.
