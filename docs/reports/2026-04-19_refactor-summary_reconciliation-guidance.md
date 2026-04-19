# Reconciliation Guidance for Done Tasks

Date: 2026-04-19
Scope: `reconcile-done-code-tasks.mjs` and Diagnostics UI handling of done-task reconciliation findings

## Findings

- After the operator checks were restored, `reconciliation.finding_count` surfaced 23 done tasks without merged PR evidence.
- Those findings were real, but too flat to act on efficiently. Different cases were mixed together:
  - open PR but task already marked done
  - commit evidence exists but PR metadata is missing
  - no durable completion evidence at all
  - direct-to-main completion without PR evidence
- Operators need different responses for those categories, so a single generic warning was not enough.

## Actions Taken

- Extended `operations/bin/reconcile-done-code-tasks.mjs` with explicit classifications:
  - `open_or_unmerged_pr`
  - `commit_evidence_without_pr_metadata`
  - `done_without_merge_evidence`
  - `direct_to_main_without_merge_evidence`
- Added remediation text to each reconciliation finding directly in the operator script output.
- Updated the Diagnostics UI to show:
  - finding classification
  - a `What to do` block with operator guidance per reconciliation case

## Validation

- `node /root/.openclaw/workspace/operations/bin/reconcile-done-code-tasks.mjs`
- `npm run build` in `engineering/rook-dashboard`
- `systemctl --user restart rook-dashboard.service`
- `curl -sS http://127.0.0.1:3001/api/control/diagnostics`

Verified live behavior:

- `dashboard-0047` is classified as `open_or_unmerged_pr`
- `ops-0049` is classified as `direct_to_main_without_merge_evidence`
- findings now include remediation guidance in the live diagnostics payload

## Open Risks

- Some historical tasks likely need metadata reconciliation rather than true reopening.
- The current classification is intentionally conservative and still relies on canonical metadata, not remote GitHub inspection.
- The dashboard still has unrelated local-only API work in:
  - `src/app/api/agent/stats/route.ts`
  - `src/app/api/canonical/tasks/route.ts`

## Next Steps

1. Decide whether historical categories like `commit_evidence_without_pr_metadata` should get a batch backfill workflow.
2. Optionally add summary counts by reconciliation classification to the diagnostics overview.
3. After that, choose whether to integrate GitHub-aware validation for reconciliation, or keep the current offline-local contract.
