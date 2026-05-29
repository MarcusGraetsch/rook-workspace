# Event Dispatcher Run Metadata

Date: 2026-05-29T17:07:14Z

Scope: Event dispatcher runtime metadata, event-ledger summary readback, dashboard diagnostics, and regression coverage.

## Lagebild

The Rook/OpenClaw event ledger is now contract-validated, TTL-aware, and included in the aggregate control-plane check. The remaining operational blind spot was dispatcher execution history: operators could see queue state, receipts, and dead letters, but not whether the dispatcher had recently run, what it processed, or why delivery failed.

This slice adds dispatcher run metadata as a runtime projection under `/root/.openclaw/runtime/operations/events/dispatcher/`. The Git-backed event ledger remains the source of truth for immutable event state; dispatcher metadata is operational telemetry.

## Befunde

- `dispatch-events.mjs` returned useful counts to stdout but did not persist last-run state.
- `summarize-events.mjs` could not report dispatcher freshness or delivery counts.
- The dashboard Event Ledger panel had no place to show last dispatcher run, delivered count, or last failure reason.
- Live outbox was empty during validation, so a zero-event dispatcher run could safely validate metadata writing without moving any event files.

## Arbeitsplan

1. Persist dispatcher run metadata after every `dispatch-events.mjs` execution.
2. Store both `latest.json` and monthly JSONL history in runtime state.
3. Expose the latest run through `summarize-events.mjs`.
4. Extend event-ledger regression coverage to assert run metadata exists.
5. Show dispatcher status and latest run details in Dashboard Diagnostics.
6. Validate with a real empty outbox dispatch run, event checks, dashboard build, and control-plane check.

## Umgesetzte Änderungen

- `operations/bin/dispatch-events.mjs`
  - Writes runtime metadata to `/root/.openclaw/runtime/operations/events/dispatcher/latest.json`.
  - Appends monthly history to `/root/.openclaw/runtime/operations/events/dispatcher/YYYY-MM.jsonl`.
  - Records run ID, timestamps, duration, queue, dry-run flag, checked/archived/dead-lettered/delivered counts, delivery failures, delivery state counts, and last error.
- `operations/bin/summarize-events.mjs`
  - Adds `dispatcher.runtime_dir`.
  - Adds `dispatcher.latest_run` from runtime metadata when present.
- `operations/bin/check-event-ledger.mjs`
  - Adds regression assertions for dispatcher run metadata and summary readback.
- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`
  - Adds dispatcher status to the Event Ledger summary.
  - Adds latest dispatcher run details with counts and last error.

## Validierung

- `node operations/bin/check-event-ledger.mjs`
  - Passed, including the new dispatcher run metadata assertion.
- `node operations/bin/dispatch-events.mjs --queue outbox --limit 10`
  - Passed on an empty live outbox and wrote runtime metadata.
- `node operations/bin/summarize-events.mjs`
  - Passed and returned `dispatcher.latest_run` with `ok: true`, `checked: 0`, `delivered: 0`.
- `sed -n '1,140p' /root/.openclaw/runtime/operations/events/dispatcher/latest.json`
  - Confirmed the runtime metadata record exists.
- `npm run build` in `engineering/rook-dashboard`
  - Passed with Next.js production build and TypeScript checks.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `git diff --check`
  - Passed for the changed operations and dashboard files.

## Open Risks

- Dispatcher freshness is visible in summary/dashboard, but the control-plane gate does not yet warn if the last run is stale.
- Runtime metadata is intentionally mutable telemetry. It should not be treated as the authoritative event ledger.
- Monthly JSONL history can grow over time and may need rotation policy if dispatcher cadence increases.

## Nächste Schritte

1. Add dispatcher freshness/staleness thresholds to `check-runtime-control-plane.mjs`.
2. Add receipt/archive replay integrity checks.
3. Wire canonical task status mutations to emit task events automatically.
4. Add a lightweight retention policy for dispatcher JSONL history if operational volume grows.
