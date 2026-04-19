# Diagnostics Check Failure Handling

Date: 2026-04-19
Scope: Dashboard diagnostics API/runtime behavior when subordinate check scripts are missing or fail

## Findings

- The Diagnostics API used `runNodeJson()` to execute local operator scripts, but it ignored the child process exit code.
- When a check script was missing, `node <script>` exited non-zero, but the route parsed empty stdout as `{}` and silently treated the result like a successful empty payload.
- This created false operator confidence:
  - Integrity looked merely `false` instead of failed
  - Backup integrity looked merely `false` instead of failed
  - Done reconciliation could misleadingly render as “No historical done tasks...”
- The live system currently lacks at least these scripts:
  - `operations/bin/check-canonical-task-integrity.mjs`
  - `operations/bin/check-runtime-backup-integrity.mjs`
  - `operations/bin/reconcile-done-code-tasks.mjs`

## Actions Taken

- Hardened `runNodeJson()` in the dashboard diagnostics API so non-zero child exits now fail explicitly.
- Added `runNodeJsonCheck()` so the route can continue returning a useful diagnostics payload while marking individual checks as failed.
- Updated the Diagnostics UI to render explicit failure panels for:
  - Integrity
  - Done Reconciliation
  - Backup Integrity
- Each panel now shows the concrete failing command instead of silently pretending the check succeeded with no findings.

## Validation

- `npm run build` in `engineering/rook-dashboard`
- live `curl http://127.0.0.1:3001/api/control/diagnostics`

Validated behavior:

- `integrity.status === "error"`
- `reconciliation.status === "error"`
- `backup_integrity.status === "error"`
- the error messages now include the real `MODULE_NOT_FOUND` details

## Open Risks

- The underlying operator scripts are still missing, so the checks remain red until those scripts are restored or the diagnostics contract is changed intentionally.
- The dashboard repo still contains separate local-only work in:
  - `src/app/api/agent/stats/route.ts`
  - `src/app/api/canonical/tasks/route.ts`

## Next Steps

1. Decide whether the missing diagnostics scripts should be restored in `operations/bin/` or removed from the diagnostics contract.
2. If they remain part of the contract, implement them in a minimal, operator-trustworthy form.
3. Only after that should the diagnostics summary be tightened further around integrity/backup/reconciliation health.
