# Reconciliation Summary Counts

Date: 2026-04-19
Scope: Diagnostics summary and reconciliation prioritization in the dashboard

## Findings

- After adding reconciliation classifications, operators still had to scan the whole findings list to understand where the real concentration was.
- The live distribution matters operationally because the remediation path differs by class:
  - open PR
  - commit evidence but missing PR metadata
  - no completion evidence
  - direct-to-main exception

## Actions Taken

- Added server-side reconciliation summary aggregation in `src/app/api/control/diagnostics/route.ts`.
- The diagnostics summary now includes:
  - `reconciliation_open_pr`
  - `reconciliation_commit_only`
  - `reconciliation_no_evidence`
  - `reconciliation_direct_main`
- Updated `src/app/diagnostics/page.tsx` to show these counts at the top of the Done Reconciliation panel.

## Validation

- `npm run build` in `engineering/rook-dashboard`
- `curl -sS http://127.0.0.1:3001/api/control/diagnostics`

Observed live summary:

- `reconciliation_open_pr = 1`
- `reconciliation_commit_only = 7`
- `reconciliation_no_evidence = 13`
- `reconciliation_direct_main = 2`

## Open Risks

- The counts improve prioritization, but they do not resolve the underlying metadata debt.
- The dashboard repo still contains separate local-only API work in:
  - `src/app/api/agent/stats/route.ts`
  - `src/app/api/canonical/tasks/route.ts`

## Next Steps

1. Use the new summary counts to work the reconciliation backlog in class order instead of task-by-task scanning.
2. Decide whether `direct_to_main_without_merge_evidence` should become an explicit accepted exception model.
3. Consider adding summary counts for control-plane remediation categories in the same style if operators benefit from the pattern.
