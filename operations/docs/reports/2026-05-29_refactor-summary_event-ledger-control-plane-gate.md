# Event Ledger Control-Plane Gate

Date: 2026-05-29T16:40:51Z

Scope: Aggregate runtime control-plane check for the Rook/OpenClaw event ledger.

## Lagebild

The event ledger now has three layers of protection:

- Contract validation through `operations/bin/validate-event.mjs`.
- Queue behavior and replay/idempotency regression coverage through `operations/bin/check-event-ledger.mjs`.
- Dashboard diagnostics for pending TTL risk, receipts, and dead letters.

Before this slice, the aggregate control-plane gate did not include event-ledger health. That meant a routine `node operations/bin/check-runtime-control-plane.mjs` could remain green even if queued event TTLs were expired or dead letters existed.

## Befunde

- `check-runtime-control-plane.mjs` already had a source-based finding model suitable for event-ledger findings.
- `summarize-events.mjs` already exposes the needed queue health fields: expired pending count, expiring-soon count, invalid timing count, dead-letter count, and recent evidence.
- Live event-ledger state at validation time was clean: no pending events, no expired pending events, no soon-expiring pending events, and no dead letters.

## Arbeitsplan

1. Call `operations/bin/summarize-events.mjs` from the aggregate control-plane check.
2. Add `event_ledger` findings for expired pending events, invalid pending timing, soon-expiring pending events, and dead letters.
3. Classify expired/invalid pending events as errors, soon-expiring/dead-letter presence as warnings.
4. Register an `event_ledger` subcheck in the control-plane `checks` array.
5. Validate with event-ledger regression and the aggregate control-plane command.

## Umgesetzte Änderungen

- `operations/bin/check-runtime-control-plane.mjs`
  - Adds `EVENT_LEDGER_SUMMARY_SCRIPT`.
  - Reads `summarize-events.mjs` output as part of the aggregate check.
  - Emits `event_ledger_expired_pending` as an error.
  - Emits `event_ledger_invalid_pending_timing` as an error.
  - Emits `event_ledger_pending_expiring_soon` as a warning.
  - Emits `event_ledger_dead_letters_present` as a warning.
  - Adds an `event_ledger` entry to the `checks` list.

## Validierung

- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
  - Output includes `event_ledger` check with `ok: true`.
- `node operations/bin/check-event-ledger.mjs`
  - Passed all event-ledger regressions.
- `git diff --check -- operations/bin/check-runtime-control-plane.mjs`
  - Passed.

## Open Risks

- This gate reads current queue state but does not yet record dispatcher run latency, last run timestamp, or delivery count history.
- Dead-letter presence is currently a warning rather than an error. That keeps historical review artifacts from hard-failing the whole platform, but it still requires operator judgment if dead letters accumulate.
- The remediation commands are guided/manual; no automatic repair path is triggered from the control-plane check.

## Nächste Schritte

1. Add dispatcher run metadata under runtime or operations health.
2. Surface event-ledger check state in the dashboard summary cards, not only the detailed findings list.
3. Add an archive/receipt replay integrity command that confirms each receipt references a valid archived event.
4. Wire canonical task status mutations to emit task events automatically.
