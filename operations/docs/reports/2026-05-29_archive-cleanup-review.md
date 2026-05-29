# Archive Cleanup Review

- date: 2026-05-29 12:13 CEST
- scope: canonical task archive cleanup planner output
- mode: review only, no files moved

## Summary

`node operations/bin/plan-archive-task-cleanup.mjs` currently reports 8 dry-run actions. The planner is correctly identifying ambiguity, but the actions should not all be treated the same.

The active canonical task set is healthy. These findings are archive hygiene issues, not active task corruption.

## Findings

### Preserve With Special Handling

#### `agent-0001`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-agent/agent-0001.json`
- archive file: `/root/.openclaw/workspace/operations/archive/tasks/rook-agent/agent-0001.json`
- recommendation: preserve, do not auto-quarantine without a migration note

This is not a stale copy of the same task. The active task is `Replace prompt heartbeats with structured health snapshots`; the archived task is an older Ecology Dashboard task. They share `task_id=agent-0001` but represent different work. This is a historical ID collision.

Safe follow-up: add an explicit historical-collision manifest or rename/quarantine the archive only with a durable note explaining the original `task_id`, title, issue, and file path.

### Quarantine Candidates After Backup Preflight

#### `dashboard-0043`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-dashboard/dashboard-0043.json`
- archive file: `/root/.openclaw/runtime/operations/archive/tasks/rook-dashboard/dashboard-0043.json`
- recommendation: quarantine runtime archive duplicate

The active record is `done`; the runtime archive record is an older `blocked` snapshot. Preserve the active task.

#### `ops-0013`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-workspace/ops-0013.json`
- archive file: `/root/.openclaw/runtime/operations/archive/tasks/rook-workspace/ops-0013.json`
- recommendation: quarantine runtime archive duplicate

Both records describe the same completed work and commit evidence. The active record has newer sync metadata.

#### `ops-0018`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-workspace/ops-0018.json`
- archive file: `/root/.openclaw/runtime/operations/archive/tasks/rook-workspace/ops-0018.json`
- recommendation: quarantine runtime archive duplicate

Both records describe the same completed smoke-test work and commit evidence. The runtime copy is older.

#### `ops-0019`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-workspace/ops-0019.json`
- archive file: `/root/.openclaw/runtime/operations/archive/tasks/rook-workspace/ops-0019.json`
- recommendation: quarantine runtime archive duplicate

Both records describe the same completed full-pipeline smoke test. The active record has later sync metadata.

#### `ops-0028`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-workspace/ops-0028.json`
- archive file: `/root/.openclaw/runtime/operations/archive/tasks/rook-workspace/ops-0028.json`
- recommendation: quarantine runtime archive duplicate

Both records describe the same completed full-pipeline smoke test and commit evidence. The active record has later sync metadata.

#### `ops-0036`

- active file: `/root/.openclaw/workspace/operations/tasks/rook-workspace/ops-0036.json`
- archive file: `/root/.openclaw/runtime/operations/archive/tasks/rook-dashboard/ops-0036.duplicate-2026-04-03.json`
- recommendation: quarantine runtime archive duplicate and preserve filename evidence

The active record is completed with merged PR metadata. The archive record is an older blocked snapshot under a different project path and has a deliberate duplicate filename suffix. Do not rename it to `ops-0036.json`; move it as-is only if applying quarantine.

## Apply Policy

Do not add a broad `--apply` that moves all planner actions without review. A safe apply path should:

1. Require `--apply` plus a second explicit selector such as `--task-id` or `--allow-reviewed`.
2. Refuse to move `workspace_archive` records unless a migration note is supplied.
3. Write a JSON manifest next to every moved file with:
   - original path
   - target path
   - task_id
   - project_id
   - sha256 before move
   - reason
   - reviewed_at
4. Verify a fresh runtime backup exists before moving runtime archive files.
5. Re-run:
   - `node operations/bin/check-canonical-task-integrity.mjs`
   - `node operations/bin/plan-archive-task-cleanup.mjs`
   - `curl -sS http://127.0.0.1:3001/api/control/diagnostics`

## Recommended Next Step

Build an apply mode that only supports reviewed runtime archive duplicates first. Leave `agent-0001` as review-only until a separate historical-collision migration is designed.
