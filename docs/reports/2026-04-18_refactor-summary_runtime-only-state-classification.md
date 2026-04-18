# Runtime-Only Task State Classification

Date: 2026-04-18
Scope: classification of runtime-only task overlays under `/root/.openclaw/runtime/operations/task-state/`

## Summary

The runtime-only task-state checks previously reported all orphaned overlays in the same flat shape.

That made the output useful for detection, but not yet for action.

This session added a lightweight classification and recommended action to the diagnostics so each runtime-only overlay now points toward a likely next step.

## Changed

- `operations/bin/check-runtime-only-task-state.mjs`
- `operations/bin/check-runtime-control-plane.mjs`

## Classification Model

Current classes:

- `stale_runtime_overlay_for_archived_task`
  - recommended action: `prune_runtime_overlay`
- `runtime_overlay_with_workspace_main_evidence`
  - recommended action: `compare_against_workspace_main`
- `backup_only_task_evidence`
  - recommended action: `review_for_restore_or_archive`
- `orphan_runtime_overlay`
  - recommended action: `manual_investigation`

## Current Live Interpretation

Based on the current runtime state:

- `rook-workspace/ops-0014.json`
  - archive already exists
  - should be treated primarily as stale runtime residue
- `rook-agent/agent-0001.json`
  - no canonical or archive copy in the live workspace
  - backup evidence exists
  - needs restore/archive review, not blind deletion
- `rook-workspace/ops-0034.json`
  - no canonical or archive copy in the live workspace
  - backup evidence exists
  - also needs restore/archive review

## Why This Matters

Not every runtime-only overlay should be handled the same way:

- some are safe to prune
- some may represent lost durable history
- some need comparison with a clean checkout before touching live state

This classification reduces the risk of deleting the wrong thing while still making cleanup actionable.

## Validation

Executed:

- `node operations/bin/check-runtime-only-task-state.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Observed result:

- each runtime-only entry now includes `classification`
- each runtime-only entry now includes `recommended_action`
- aggregate control-plane output preserves those fields
