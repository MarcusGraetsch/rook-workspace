# Dashboard Review-Due Summary

Date: 2026-04-18
Scope: surfacing posture-policy review pressure at summary level

## Summary

The diagnostics page already showed per-finding review dates, but operators still had to scan individual findings to understand whether any acknowledged posture exceptions were becoming due.

This package adds a small summary-level aggregation for control-plane review pressure:

- number of findings due soon
- number of overdue findings

## Changed

- `engineering/rook-dashboard/src/app/api/control/diagnostics/route.ts`
- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`

## Behavior

The diagnostics API now computes:

- `summary.control_plane_review_due_soon`
- `summary.control_plane_review_overdue`

The diagnostics page displays those counts directly in the Control Plane summary card.

## Validation

Executed:

- `npm run build` in `engineering/rook-dashboard`

Expected outcome:

- production build remains green
- operators can see summary-level review pressure without scanning individual findings first
