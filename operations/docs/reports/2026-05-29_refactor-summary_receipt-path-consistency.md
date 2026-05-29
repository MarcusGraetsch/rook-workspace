# Receipt Path Consistency

Date: 2026-05-29T18:00:52Z

Scope: Non-blocking receipt `event_file` path consistency warnings and control-plane propagation.

## Lagebild

Event receipts are now schema-validated and replayed against archived events by `event_id` and digest. Existing receipt records still store absolute `event_file` paths. Those paths are useful diagnostics, but they should not be the authority for replay because archives can move or be restored in different roots.

This slice adds path consistency as a warning only. Replay remains authoritative by `event_id`, archived event validity, digest, and core metadata.

## Befunde

- Current live receipts have absolute `event_file` values that match the current archive paths.
- A future restore, repo relocation, or archive migration could make receipt paths stale while event ID and digest still replay correctly.
- The control-plane gate already has room to propagate event replay warnings separately from replay errors.

## Arbeitsplan

1. Add normalized path comparison between receipt `event_file` and the archive file resolved by `event_id`.
2. Emit `receipt_event_file_path_mismatch` as a warning, not an error.
3. Surface replay warnings in `check-runtime-control-plane.mjs` as `event_replay_integrity_warnings`.
4. Validate replay integrity, event-ledger regression, control-plane gate, and diff hygiene.

## Umgesetzte Änderungen

- `operations/bin/check-event-replay-integrity.mjs`
  - Adds normalized receipt/archive path comparison.
  - Emits `receipt_event_file_path_mismatch` warnings.
- `operations/bin/check-runtime-control-plane.mjs`
  - Emits `event_replay_integrity_warnings` as an `event_ledger` warning when replay has non-blocking warnings.

## Validierung

- `node operations/bin/check-event-replay-integrity.mjs`
  - Passed with `warning_count: 0`, `error_count: 0`.
- `node operations/bin/check-event-ledger.mjs`
  - Passed all event-ledger regressions.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.
- `git diff --check`
  - Passed for changed files.

## Open Risks

- This does not normalize historical absolute paths to relative paths. It only detects mismatches.
- Path comparison uses resolved local paths; cross-host replay should still trust event ID and digest first.
- No dedicated receipt migration manifest exists for future path rewrites.

## Nächste Schritte

1. Add a runbook for replay-integrity failure and warning remediation.
2. Consider relative `event_file` values for newly emitted receipts after migration planning.
3. Wire canonical task status mutations to emit task events automatically.
4. Add dashboard visibility for event replay warnings if they appear.
