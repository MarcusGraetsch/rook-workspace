# Runtime-Only Aggregate Alignment

Date: 2026-04-20
Scope: `operations/bin/check-runtime-control-plane.mjs`

## Findings

- After narrowing runtime-state coverage to required overlays only, the aggregate control-plane check still reused that reduced canonical task set for `runtime_only_task_state`.
- That made the aggregate report classify many valid runtime overlays as runtime-only, while the dedicated script `check-runtime-only-task-state.mjs` correctly reported `0`.
- The result was split-brain diagnostics: the standalone check and the aggregate check no longer agreed on the same runtime tree.

## Actions Taken

- Separated the canonical task views inside `check-runtime-control-plane.mjs`:
  - `canonicalMapRequired` for `runtime_state_coverage`
  - `canonicalMapAll` for `runtime_only_task_state`
- Left the stricter overlay-required logic in place for coverage warnings.
- Restored the runtime-only comparison to the full canonical task set so aggregate and standalone diagnostics share the same source of truth.

## Validation

- `node operations/bin/check-runtime-only-task-state.mjs`
  - result: `runtime_only_count: 0`
- `node operations/bin/check-runtime-control-plane.mjs`
  - result:
    - `runtime_state_coverage.warning_count: 0`
    - `runtime_only_task_state.warning_count: 0`
    - total warning count reduced to the real remaining issues
- Reviewed the final diff for `operations/bin/check-runtime-control-plane.mjs`.

## Open Risks

- The remaining warnings are now concentrated in the actually unresolved areas:
  - stale `agents/main`
  - dispatcher hook-model warning heuristic
- This change only fixed diagnostic consistency; it did not archive or remove any runtime state.

## Next Steps

1. Tackle `agents/main` with a dry-run archival path after checking the active references.
2. Reassess whether `dispatcher_hook_model_not_provider_qualified` still represents a real contract issue.
