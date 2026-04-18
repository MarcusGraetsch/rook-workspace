# Dashboard Diagnostics Freshness

Date: 2026-04-18
Scope: making the diagnostics view easier to interpret over time

## Summary

The diagnostics page now exposes the control-plane findings, but operators still had to infer whether they were looking at fresh data and whether acknowledged posture exceptions were nearing review.

This package adds:

- a page-level `Last checked` timestamp
- a control-plane-level `Checked` timestamp
- a review-status badge for acknowledged findings with `review_after`

## Changed

- `engineering/rook-dashboard/src/app/api/control/diagnostics/route.ts`
- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`

## Behavior

The diagnostics API now returns a top-level `checked_at` timestamp.

The diagnostics page now:

- shows when the diagnostics payload was fetched
- shows when the control-plane payload was generated
- marks acknowledged findings as:
  - `Review overdue`
  - `Review soon`
  - or `Review <date>`

This keeps policy acknowledgements visible while adding temporal context.

## Validation

Executed:

- `npm run build` in `engineering/rook-dashboard`

Expected outcome:

- production build stays green
- `/diagnostics` renders with the new timestamp and review-status data
