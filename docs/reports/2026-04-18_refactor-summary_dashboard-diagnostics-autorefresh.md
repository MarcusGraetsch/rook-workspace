# Dashboard Diagnostics Auto-Refresh

Date: 2026-04-18
Scope: reducing staleness on the diagnostics page without adding hidden polling behavior

## Summary

The diagnostics page already showed `checked_at`, but operators still had to manually refresh to keep the page current.

This package adds a conservative page-local auto-refresh loop:

- refresh every 30 seconds
- visible `Updating diagnostics...` state during background refresh
- visible `Next refresh ...` timestamp between refreshes

## Changed

- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`

## Behavior

Auto-refresh is limited to the diagnostics page and does not change backend scheduling.

The page now:

- loads immediately on first render
- refreshes in the background every 30 seconds
- keeps the refresh visible to the operator instead of silently polling

## Validation

Executed:

- `npm run build` in `engineering/rook-dashboard`

Expected outcome:

- production build remains green
- diagnostics page stays readable while becoming less stale during active use
