# Event Ledger Pending TTL Diagnostics

Date: 2026-05-29T16:35:00Z

Scope: Event-ledger status summarization, regression checks, and dashboard diagnostics for pending event TTL risk.

## Lagebild

The Rook/OpenClaw operations layer now treats the JSON event ledger as the controlled bridge between Rook/OpenClaw, Hermes/Phoenix, dashboard, and automation targets. The previous hardening slice made `message_id` explicit and prevented expired queued events from being archived or delivered.

This slice extends observability around that contract. The dashboard already showed receipts and dead letters, but pending queue age and TTL risk were not visible before processing. Operators could therefore see failures only after the dispatcher dead-lettered an event.

## Befunde

- `operations/bin/summarize-events.mjs` counted pending files but did not inspect their `created_at` and `ttl_hours` fields.
- The Diagnostics page surfaced dead letters but did not warn about pending events that were already expired or close to expiry.
- The event-ledger regression suite used fixed-date valid fixtures. With TTL enforcement active, those fixtures would eventually become stale and produce time-dependent failures.

## Arbeitsplan

1. Add pending queue timing diagnostics to the event summary.
2. Keep the live dashboard signal compact: pending count, oldest pending age, and TTL risk.
3. Add regression coverage for expired pending event summaries.
4. Make queue-processing fixtures fresh at test runtime so TTL tests remain stable after May 2026.
5. Validate event tooling, dashboard build, and runtime control-plane posture.

## Umgesetzte Änderungen

- `operations/bin/summarize-events.mjs`
  - Adds `pending.expired_count`, `pending.expiring_soon_count`, `pending.invalid_timing_count`.
  - Adds oldest pending age/file and next expiry fields.
  - Includes capped lists of expired and soon-expiring pending events for UI/debug use.
- `operations/bin/check-event-ledger.mjs`
  - Adds runtime-fresh fixture writing for non-expiry queue tests.
  - Adds pending expiry summary regression coverage.
- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`
  - Adds Event Ledger TTL risk UI.
  - Shows oldest pending age in the Event Ledger summary.
  - Shows a warning band when pending events are expired or expiring within 24 hours.

## Validierung

- `node operations/bin/check-event-ledger.mjs`
  - Passed, including the new pending expiry summary check.
- `node operations/bin/summarize-events.mjs`
  - Passed. Live ledger currently reports `pending: 0`, `expired_count: 0`, `expiring_soon_count: 0`, `dead_lettered: 0`.
- `npm run build` in `engineering/rook-dashboard`
  - Passed with Next.js production build and TypeScript checks.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `git diff --check`
  - Passed for the changed operations and dashboard files.

## Open Risks

- Pending TTL risk is visible in Diagnostics, but not yet promoted into the aggregate runtime control-plane check.
- The dashboard shows summary counts and file references, not a dedicated drill-down table for all pending events.
- The event dispatcher still runs as an external supervised service; last-run status and delivery latency are not yet modeled as first-class metrics.

## Nächste Schritte

1. Add event-ledger pending TTL findings to `check-runtime-control-plane.mjs`.
2. Add dispatcher run metadata: last run, processed count, delivered count, dead-letter count, and failure reason.
3. Add a read-only replay integrity command that validates archived events and receipts together.
4. Wire task status writebacks to emit events automatically from canonical task mutations.
