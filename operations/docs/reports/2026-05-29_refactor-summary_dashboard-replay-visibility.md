# Dashboard Replay Visibility

Date: 2026-05-29T18:17:32Z

Scope: Dashboard Diagnostics visibility for event replay integrity warnings and errors.

## Lagebild

Replay integrity is now checked by `check-event-replay-integrity.mjs` and gated through `check-runtime-control-plane.mjs` as `event_replay_integrity_failed` and `event_replay_integrity_warnings`. Before this slice, those findings were technically visible in the generic Control Plane findings list, but not highlighted in the Event Ledger section where an operator naturally looks for event archive, receipt, dispatcher, and dead-letter state.

## Befunde

- The Diagnostics page already fetches both `/api/control/diagnostics` and `/api/control/events`.
- Event Ledger UI already shows pending, archive, receipt, TTL, dead-letter, and dispatcher state.
- Replay findings are emitted through `data.control_plane.findings` rather than the event summary payload, so the UI should derive replay status from control-plane findings.

## Arbeitsplan

1. Extend the Diagnostics control-plane finding type with optional `replay_findings`.
2. Filter `event_ledger` replay findings in the Diagnostics page.
3. Add a dedicated Replay Integrity panel inside the Event Ledger section.
4. Show a green clean state when no replay findings exist.
5. Show issue counts, severity, event IDs, receipt/archive paths, and remediation text when findings exist.
6. Validate Dashboard build and control-plane/replay checks.

## Umgesetzte Änderungen

- `engineering/rook-dashboard/src/app/diagnostics/page.tsx`
  - Adds typed `replay_findings` support.
  - Adds a Replay Integrity panel to the Event Ledger section.
  - Displays clean replay state when archives and receipts replay successfully.
  - Displays focused warning/error cards for replay findings when the control-plane gate reports them.

## Validierung

- `npm run build` in `engineering/rook-dashboard`
  - Passed with Next.js production build and TypeScript checks.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `node operations/bin/check-event-replay-integrity.mjs`
  - Passed with `warning_count: 0`, `error_count: 0`.
- `git -C engineering/rook-dashboard diff --check -- src/app/diagnostics/page.tsx`
  - Passed.

## Open Risks

- The Replay Integrity panel only appears from live control-plane findings. It does not independently run the replay checker.
- Large replay finding payloads are capped upstream by the control-plane check, so the UI shows the first emitted findings rather than exhaustive lists.
- The clean state depends on the control-plane endpoint being fresh.

## Nächste Schritte

1. Wire canonical task status mutations to emit task events automatically.
2. Add a compact Event Ledger status card to the top KPI grid if operators want replay status visible above the fold.
3. Add helper commands for safe receipt digest repair and path normalization if replay incidents recur.
