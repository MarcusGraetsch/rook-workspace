# Event Dispatcher Freshness Gate

Date: 2026-05-29T17:32:38Z

Scope: Control-plane freshness checks for event dispatcher runtime metadata.

## Lagebild

The event ledger now records dispatcher runtime metadata under `/root/.openclaw/runtime/operations/events/dispatcher/` and exposes the latest run through `summarize-events.mjs`. The dashboard can display the latest dispatcher run, but the aggregate control-plane gate still needed to enforce freshness and failure status.

The installed `rook-event-dispatcher.timer` runs every 5 minutes. A 15-minute staleness threshold allows brief service/timer jitter while still catching a stopped timer or broken dispatcher path quickly.

## Befunde

- `check-runtime-control-plane.mjs` already had an `event_ledger` check for queue TTL and dead-letter risks.
- Dispatcher runtime metadata existed and was current during validation.
- The first implementation attempted to read `summarize-events.mjs` through `execFile('node', [script])`; in this process context that returned empty stdout while direct CLI execution was fine. The safer fix is to import and call `getEventLedgerStatus()` directly.

## Arbeitsplan

1. Add an audit-friendly dispatcher freshness threshold to `runtime-posture-policy.json`.
2. Extend `check-runtime-control-plane.mjs` with dispatcher run-missing, failed-run, invalid timestamp, and stale-run findings.
3. Treat missing/stale metadata as warnings, failed latest run and invalid timestamp as errors.
4. Use direct module import for event-ledger summary readback instead of subprocess JSON parsing.
5. Validate event checks, summary readback, and the aggregate control-plane gate.

## Umgesetzte Änderungen

- `operations/config/runtime-posture-policy.json`
  - Adds `event_dispatcher.max_stale_minutes: 15`.
- `operations/bin/check-runtime-control-plane.mjs`
  - Imports `getEventLedgerStatus()` from `summarize-events.mjs`.
  - Adds default dispatcher freshness threshold fallback.
  - Adds `event_dispatcher_run_missing` warning.
  - Adds `event_dispatcher_last_run_failed` error.
  - Adds `event_dispatcher_finished_at_invalid` error.
  - Adds `event_dispatcher_run_stale` warning.
- `operations/bin/summarize-events.mjs`
  - Keeps CLI behavior compatible while remaining importable for direct readback.

## Validierung

- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
  - `event_ledger` check is present and green.
- `node operations/bin/summarize-events.mjs`
  - Passed and exposes `dispatcher.latest_run`.
- `node operations/bin/check-event-ledger.mjs`
  - Passed all event-ledger regressions.
- `git diff --check`
  - Passed for the changed files.

## Open Risks

- The freshness threshold is currently global. If the event dispatcher cadence changes per environment, the policy should grow environment-specific overrides.
- This does not yet validate monthly dispatcher JSONL history integrity.
- The staleness warning does not auto-restart the timer; it intentionally remains an operator-visible gate signal.

## Nächste Schritte

1. Add archive/receipt replay integrity checks.
2. Add dashboard summary card support for the `event_ledger` control-plane subcheck.
3. Wire canonical task status mutations to emit task events automatically.
4. Add retention or compaction policy for dispatcher JSONL history if event volume increases.
