# Runtime Archive Duplicate Quarantine

- date: 2026-05-29 12:23 CEST
- scope: reviewed runtime archive duplicates
- mode: guarded live apply with backup preflight

## Lagebild

The archive cleanup planner had 8 actions before apply: 7 active/archive duplicate warnings and 1 filename mismatch review. A manual review had classified six mutable runtime archive records as safe quarantine candidates, while `agent-0001` remained a historical Git-backed workspace archive collision.

## Preconditions

- Runtime backup integrity was checked before apply.
- Latest local backup: `/root/backups/rook-runtime/2026-05-29T00-29-38Z`.
- Backup integrity result: `ok=true`.
- Apply command used: `node operations/bin/plan-archive-task-cleanup.mjs --allow-reviewed --apply`.

## Applied Moves

The following runtime archive files were moved into `/root/.openclaw/runtime/operations/archive/task-collisions/`:

- `rook-dashboard/dashboard-0043.json`
- `rook-dashboard/ops-0036.duplicate-2026-04-03.json`
- `rook-workspace/ops-0013.json`
- `rook-workspace/ops-0018.json`
- `rook-workspace/ops-0019.json`
- `rook-workspace/ops-0028.json`

Each moved file has a sidecar `.manifest.json` with original path, target path, task id, project id, SHA-256, reason, review timestamp, move timestamp, and backup preflight evidence.

## Refused Or Skipped Actions

- `agent-0001` was refused because it is a Git-backed workspace archive collision and requires a historical migration note.
- `review_archive_filename_mismatch` for `ops-0036` was skipped because rename actions are intentionally unsupported. The duplicate file was moved as-is with its evidence-preserving filename.

## Validation

- `node operations/bin/check-canonical-task-integrity.mjs`: `ok=true`, no duplicates, no mismatches.
- `node operations/bin/plan-archive-task-cleanup.mjs`: `action_count=1`, only `agent-0001` remains.
- `curl -sS http://127.0.0.1:3001/api/control/diagnostics`: `status=ok`.
- Dashboard diagnostics summary after apply:
  - `control_plane_ok=true`
  - `backup_integrity_ok=true`
  - `dashboard_service_ok=true`
  - `kanban_integrity_ok=true`
  - `kanban_integrity_warnings=0`
  - `integrity_ok=true`
  - `integrity_warnings=1`
  - `archive_cleanup_actions=1`

## Open Risks

- `agent-0001` still needs a historical-collision manifest or dedicated migration.
- Control-plane warnings remain at 28; they are unrelated to this archive cleanup and include known model config drift, user systemd drift, and stale agent directory warnings.
- Provider probe remains unavailable because `KIMI_API_KEY` is not loaded in the dashboard diagnostic environment.

## Next Steps

1. Add a Git-backed historical-collision manifest for `agent-0001`.
2. Update the planner to recognize approved historical collision manifests so they stop appearing as generic cleanup actions.
3. Re-run dashboard diagnostics after the manifest change; target `archive_cleanup_actions=0` without hiding real future archive collisions.
