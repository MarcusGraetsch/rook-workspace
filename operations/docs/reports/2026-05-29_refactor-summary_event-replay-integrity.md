# Event Replay Integrity

Date: 2026-05-29T17:40:38Z

Scope: Event archive validation, receipt replay validation, digest repair, event-ledger regression coverage, and control-plane gating.

## Lagebild

The Rook/OpenClaw event ledger now has schema validation, TTL handling, dispatcher runtime metadata, and dispatcher freshness gating. The remaining gap was replay integrity: a receipt should be verifiable against the archived event it acknowledges, including event ID, key metadata, and SHA-256 digest.

This is especially important because the prior `message_id` compatibility migration changed the archived event JSON records. That made the old receipt digests stale even though the semantic delivery evidence remained valid.

## Befunde

- Two archived events are present under `operations/events/archive/2026/05/`.
- Two delivery receipts are present under `operations/events/receipts/2026/05/`.
- A new replay checker initially reported two `receipt_event_digest_mismatch` errors because the archived events had been updated with `message_id` after the receipts were created.
- The receipt IDs include the first 16 characters of the event digest, so repairing digest integrity required renaming the receipt files and updating their `receipt_id` values as well as `event_digest_sha256`.

## Arbeitsplan

1. Add a read-only replay integrity checker for archives and receipts.
2. Validate archived events against `rook-hermes-event.schema.json`.
3. Verify each receipt points to an archived event and matches the archived event digest and core metadata.
4. Repair the two existing receipts to match the current archive digests.
5. Add replay integrity to `check-event-ledger.mjs`.
6. Add replay integrity failure as an `event_ledger` control-plane error.
7. Validate all event and control-plane checks.

## Umgesetzte Änderungen

- `operations/bin/check-event-replay-integrity.mjs`
  - New executable read-only checker.
  - Validates archived event JSON with the event schema.
  - Detects duplicate archived event IDs.
  - Detects receipts referencing missing archive events.
  - Detects receipt/archive digest mismatches.
  - Detects receipt/archive metadata mismatches.
- `operations/bin/check-event-ledger.mjs`
  - Adds regression coverage for replay integrity.
- `operations/bin/check-runtime-control-plane.mjs`
  - Runs replay integrity as part of the `event_ledger` gate.
  - Emits `event_replay_integrity_failed` as an error when replay checks fail.
- `operations/events/receipts/2026/05/`
  - Renamed and updated the two existing receipt files so their receipt IDs and `event_digest_sha256` values match the current archived events.

## Validierung

- `node operations/bin/check-event-replay-integrity.mjs`
  - Passed with `archive_event_count: 2`, `receipt_count: 2`, `error_count: 0`.
- `node operations/bin/check-event-ledger.mjs`
  - Passed, including `event archive receipt replay integrity`.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `node operations/bin/summarize-events.mjs`
  - Passed and shows the repaired receipts.

## Open Risks

- This check validates current archive/receipt consistency, but it does not preserve a separate migration manifest for the receipt digest repair.
- The checker validates receipt structure by required operational fields, not by a standalone JSON Schema for receipts.
- Receipt paths are still absolute in existing receipt records; the replay checker resolves by `event_id` rather than trusting `event_file`.

## Nächste Schritte

1. Add a formal `rook-hermes-receipt.schema.json`.
2. Add receipt path consistency warnings after historical absolute-path behavior is normalized.
3. Wire canonical task status mutations to emit task events automatically.
4. Add a short runbook for event replay failure remediation.
