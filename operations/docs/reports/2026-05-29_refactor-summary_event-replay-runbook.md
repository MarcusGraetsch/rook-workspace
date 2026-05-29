# Event Replay Runbook

Date: 2026-05-29T18:07:14Z

Scope: Operator documentation for event archive/receipt replay failures and warnings.

## Lagebild

The event ledger now validates archived events, validates receipts, checks receipt/archive replay integrity, gates replay errors in the control plane, and warns on receipt path drift. Those signals need an operator-facing remediation path so the platform remains maintainable after failures.

## Befunde

- `operations/docs/runbooks/` already exists and contains an event dispatcher runbook.
- `operations/events/README.md` documents the replay integrity command but not detailed remediation.
- Replay findings have clear type names that can map directly to runbook sections.

## Arbeitsplan

1. Add an event replay integrity runbook.
2. Document all current replay finding types and operator response steps.
3. Link the replay runbook from the event dispatcher runbook.
4. Link the replay runbook from `operations/events/README.md`.
5. Validate replay checks and control-plane gate after the documentation change.

## Umgesetzte Änderungen

- `operations/docs/runbooks/event-replay-integrity.md`
  - New runbook for replay integrity scope, checks, finding types, and repair discipline.
  - Covers `invalid_archive_event`, `duplicate_archive_event_id`, `invalid_receipt`, `receipt_event_missing`, `receipt_event_digest_mismatch`, `receipt_event_metadata_mismatch`, and `receipt_event_file_path_mismatch`.
- `operations/docs/runbooks/event-dispatcher.md`
  - Adds replay integrity command and links to the replay runbook.
- `operations/events/README.md`
  - Links replay failure and warning remediation to the runbook.

## Validierung

- `node operations/bin/check-event-replay-integrity.mjs`
  - Passed with `warning_count: 0`, `error_count: 0`.
- `node operations/bin/check-event-ledger.mjs`
  - Passed all event-ledger regressions.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `git diff --check`
  - Passed for changed docs.

## Open Risks

- The runbook is procedural. It does not yet include automated repair commands for every finding type.
- Future replay finding types need to be added to this runbook when introduced.
- Receipt path normalization remains a planned migration, not an automatic action.

## Nächste Schritte

1. Add dashboard visibility for replay warnings if they appear.
2. Wire canonical task status mutations to emit task events automatically.
3. Consider helper commands for safe receipt digest repair and path normalization.
