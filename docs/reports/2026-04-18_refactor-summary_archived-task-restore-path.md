# Archived Task Restore Path

Date: 2026-04-18
Scope: restoring backup-only completed task evidence into canonical archived task state

## Summary

Two remaining runtime-only overlays were not stale residue.
They were completed tasks with backup evidence but without any current canonical archive file:

- `rook-agent/agent-0001.json`
- `rook-workspace/ops-0034.json`

This session adds a conservative restore path for that case.

Instead of restoring those tasks into active canonical state, the new script restores them into:

- `workspace/operations/archive/tasks/<project>/<task>.json`

That keeps them durable and reviewable without pretending they are active work.

## Changed

- `operations/bin/restore-archived-tasks-from-backup.mjs`
- `operations/bin/check-runtime-only-task-state.mjs`
- `operations/bin/check-runtime-control-plane.mjs`
- `operations/bin/cleanup-runtime-state-overlays.mjs`
- `operations/bin/backup-runtime-to-drive.sh`

## Policy

For `backup_only_task_evidence`:

- if backup payload is a complete `done` task, restore it into canonical archived tasks
- then treat the runtime overlay as stale runtime residue and archive/prune it with the existing runtime overlay cleanup path

This keeps the sequence explicit:

1. restore durable canonical archive
2. archive stale live overlay

## Validation

Executed:

- `node operations/bin/restore-archived-tasks-from-backup.mjs`
- `node operations/bin/restore-archived-tasks-from-backup.mjs --task agent-0001 --apply`
- `node operations/bin/restore-archived-tasks-from-backup.mjs --task ops-0034 --apply`
- `node operations/bin/cleanup-runtime-state-overlays.mjs --task agent-0001 --apply`
- `node operations/bin/cleanup-runtime-state-overlays.mjs --task ops-0034 --apply`
- `node operations/bin/check-runtime-only-task-state.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Expected outcome:

- canonical archived task files exist for the restored tasks
- runtime-only overlay count falls again after overlay archival
- active task state remains untouched
