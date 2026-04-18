# Dashboard Control-Plane Visibility

Date: 2026-04-18
Scope: exposing the aggregated runtime control-plane check in the dashboard diagnostics view

## Summary

The operator-facing control-plane check had become the strongest single runtime summary, but it was only available through CLI.

This package wires that same aggregated check into the dashboard diagnostics route and page so that runtime posture, drift, stale-state findings, and acknowledged posture exceptions are visible in the existing diagnostics screen.

## Changed

- `engineering/rook-dashboard/src/app/api/control/diagnostics/route.ts`
- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`

## Behavior

The diagnostics API now includes:

- `control_plane`
- `summary.control_plane_ok`
- `summary.control_plane_warnings`
- `summary.control_plane_errors`

The diagnostics page now shows:

- a top-level Control Plane summary card
- a dedicated Control Plane panel listing aggregated findings
- severity badges for `info`, `warning`, and `error`
- acknowledgment reason and review date for posture exceptions when present

## Validation

Executed:

- `npm run build` in `engineering/rook-dashboard`

Outcome:

- Next.js production build completed successfully
- `/diagnostics` remains buildable with the new route payload shape

## Notes

The dashboard repo already had unrelated local modifications in:

- `src/lib/control/task-sync.ts`
- `src/lib/control/tasks.ts`

Those files were not touched by this package.
