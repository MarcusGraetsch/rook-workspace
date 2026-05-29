# Receipt Schema Contract

Date: 2026-05-29T17:47:43Z

Scope: Formal receipt schema, replay checker schema validation, and event ledger documentation.

## Lagebild

The event ledger now verifies archive/receipt replay integrity. Receipts had a stable generated shape through `ack-event.mjs`, but that shape was implicit in code. The next maintainability step was to make receipts a first-class contract artifact, parallel to `rook-hermes-event.schema.json`.

## Befunde

- `ack-event.mjs` consistently emits `schema_version: rook-hermes-receipt.v1` and a fixed set of fields.
- `check-event-replay-integrity.mjs` validated receipt/event consistency, but not receipt shape as a standalone contract.
- Existing live receipts already conform to the intended shape after the prior digest repair.

## Arbeitsplan

1. Add `operations/schemas/rook-hermes-receipt.schema.json`.
2. Add receipt schema validation to `check-event-replay-integrity.mjs`.
3. Keep validation dependency-free, matching the local validator style used for events.
4. Document receipt schema and replay validation in `operations/events/README.md`.
5. Validate replay integrity, event-ledger regression, control-plane gate, and diff hygiene.

## Umgesetzte Änderungen

- `operations/schemas/rook-hermes-receipt.schema.json`
  - Defines required receipt fields, allowed systems, states, classification values, digest format, timestamp format, and no additional properties.
- `operations/bin/check-event-replay-integrity.mjs`
  - Loads the receipt schema.
  - Validates required fields, additional properties, enums, timestamp format, event type format, receipt/event IDs, SHA-256 digest format, and notes type.
  - Reports invalid receipts as `invalid_receipt`.
- `operations/events/README.md`
  - Documents receipt schema requirements and the replay integrity command.

## Validierung

- `node operations/bin/check-event-replay-integrity.mjs`
  - Passed with `archive_event_count: 2`, `receipt_count: 2`, `error_count: 0`.
- `node operations/bin/check-event-ledger.mjs`
  - Passed all event-ledger regressions.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `git diff --check`
  - Passed for changed schema, checker, and docs files.

## Open Risks

- Receipt schema validation is implemented locally rather than through a general JSON Schema engine. That keeps dependencies stable but does not support every JSON Schema keyword.
- Existing receipts still use absolute `event_file` paths. Replay integrity intentionally trusts `event_id` and digest rather than path alone.
- The schema does not yet model receipt replacement/migration history.

## Nächste Schritte

1. Add receipt path consistency warnings once historical absolute paths are normalized.
2. Add a runbook for replay-integrity failure remediation.
3. Wire canonical task status mutations to emit task events automatically.
4. Consider a small shared validation helper if event and receipt validator duplication grows.
