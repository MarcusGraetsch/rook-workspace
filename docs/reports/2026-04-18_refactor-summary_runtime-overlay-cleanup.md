# Runtime Overlay Cleanup

Date: 2026-04-18
Scope: reversible cleanup path for stale runtime-only task overlays

## Summary

This session introduced a reversible cleanup path for runtime-only task overlays that are already backed by an archived task record.

Instead of deleting those overlays blindly, the new script moves them into:

- `/root/.openclaw/runtime/operations/archive/runtime-task-state/`

That preserves evidence while removing stale live overlays from the active runtime tree.

## Changed

- `operations/bin/cleanup-runtime-state-overlays.mjs`
- `operations/bin/backup-runtime-to-drive.sh`
- `operations/bin/restore-runtime-backup.sh`

## Cleanup Rule

The script currently acts only on:

- `classification = stale_runtime_overlay_for_archived_task`

Current behavior:

- default: dry run
- `--apply`: move qualifying overlays into runtime archive

It intentionally does not touch:

- backup-only task evidence
- overlays that need comparison with `workspace-main`
- orphan overlays without supporting evidence

## Why

`ops-0014` is the current clear candidate:

- it still exists under live runtime task-state
- it already has a runtime archive task copy
- it is therefore runtime residue, not unresolved task history

That kind of residue should be removable without losing recoverability.

## Backup / Restore Impact

The runtime backup bundle now archives the full runtime `archive/` subtree, not only `archive/tasks/`.

That means archived runtime overlays are preserved by the same backup/restore path as the rest of runtime archives.

## Validation

Executed:

- `node operations/bin/cleanup-runtime-state-overlays.mjs`
- `node operations/bin/cleanup-runtime-state-overlays.mjs --task ops-0014 --apply`
- `node operations/bin/check-runtime-only-task-state.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Observed result:

- `ops-0014` no longer appears as a runtime-only overlay
- backup-only cases remain untouched
- aggregate diagnostics reflect the reduced warning surface
