# Restore Diagnostics Operator Checks

Date: 2026-04-19
Scope: `operations/bin/` diagnostics helper scripts consumed by the dashboard diagnostics route

## Findings

- The dashboard diagnostics contract referenced three operator scripts that did not exist in the live workspace:
  - `check-canonical-task-integrity.mjs`
  - `reconcile-done-code-tasks.mjs`
  - `check-runtime-backup-integrity.mjs`
- After the previous honesty fix, this absence was visible as explicit check errors rather than silently swallowed empty payloads.
- The next correct step was not to hide those errors again, but to restore minimal, trustworthy checks that match the current runtime model.

## Actions Taken

- Added `check-canonical-task-integrity.mjs`
  - recursively reads canonical task JSON files
  - reports duplicate `task_id`s
  - reports `task_id`/filename and `project_id`/path mismatches
- Added `reconcile-done-code-tasks.mjs`
  - scans canonical `done` code tasks
  - reports tasks that do not have merged PR evidence
  - distinguishes between “open PR”, “commit evidence only”, and “no merged PR evidence”
- Added `check-runtime-backup-integrity.mjs`
  - inspects the latest local runtime backup
  - verifies required backup tarballs, manifests, and dashboard SQLite snapshot
- Marked all three scripts executable to match the operator-script pattern in `operations/bin/`.

## Validation

- `node /root/.openclaw/workspace/operations/bin/check-canonical-task-integrity.mjs`
- `node /root/.openclaw/workspace/operations/bin/reconcile-done-code-tasks.mjs`
- `node /root/.openclaw/workspace/operations/bin/check-runtime-backup-integrity.mjs`
- `curl -sS http://127.0.0.1:3001/api/control/diagnostics`

Observed live results:

- `integrity.ok === true`
- `backup_integrity.ok === true`
- `reconciliation.ok === true`
- `reconciliation.finding_count === 23`

## Open Risks

- The reconciliation check is intentionally conservative and currently flags many historical `done` tasks that lack merged PR evidence in canonical metadata.
- This is useful operator truth, but it will create sustained noise until either:
  - historical task metadata is reconciled, or
  - the definition of “done reconciliation” is narrowed further.

## Next Steps

1. Decide whether historical `done` tasks should be batch-reconciled or explicitly grandfathered.
2. Consider adding remediation guidance for reconciliation findings the same way control-plane findings now have guidance.
3. If desired, tighten backup integrity further with age thresholds or archive readability checks.
