# Event Replay Integrity Runbook

## Scope

Replay integrity verifies that the Git-backed event ledger can still explain delivery history:

1. Archived events under `operations/events/archive/` validate against `operations/schemas/rook-hermes-event.schema.json`.
2. Receipts under `operations/events/receipts/` validate against `operations/schemas/rook-hermes-receipt.schema.json`.
3. Each receipt references an archived event by `event_id`.
4. Receipt metadata matches the archived event.
5. `event_digest_sha256` matches the current archived event bytes.
6. `event_file` points to the resolved archived event path, reported as a warning only.

Replay integrity does not dispatch events and does not mutate files.

## Checks

Run the replay checker:

```bash
node operations/bin/check-event-replay-integrity.mjs
```

Run the full event-ledger regression suite:

```bash
node operations/bin/check-event-ledger.mjs
```

Run the aggregate control-plane gate:

```bash
node operations/bin/check-runtime-control-plane.mjs
```

Inspect current queue, receipts, and dispatcher state:

```bash
node operations/bin/summarize-events.mjs
```

## Finding Types

### `invalid_archive_event`

Meaning: an archived event is invalid JSON or fails the event schema.

Operator response:

- Do not edit the event casually.
- Inspect the file and recent commits that changed it.
- If the file was corrupted by a bad migration, repair the minimum schema violation and document the repair in `operations/docs/reports/`.
- Re-run `node operations/bin/check-event-replay-integrity.mjs`.

### `duplicate_archive_event_id`

Meaning: more than one archived event has the same `event_id`.

Operator response:

- Compare both files and identify whether this is a duplicate copy or a true collision.
- Keep only one canonical archived event for the event ID.
- Move questionable duplicates to a documented quarantine path only after a report explains the decision.
- Re-run replay and control-plane checks.

### `invalid_receipt`

Meaning: a receipt is invalid JSON or fails `rook-hermes-receipt.schema.json`.

Operator response:

- Inspect the receipt file and its corresponding archived event.
- If the receipt was emitted by `ack-event.mjs`, check for local code drift before repairing data.
- Repair only missing or malformed receipt contract fields that can be derived from the archived event.
- Re-run replay integrity.

### `receipt_event_missing`

Meaning: a receipt references an `event_id` that cannot be found in `operations/events/archive/`.

Operator response:

- Search all queues for the event:

```bash
find operations/events -name '*.json' -print | xargs rg -n '"event_id": "<event-id>"'
```

- If the event is still in `inbox/` or `outbox/`, inspect why it was not archived.
- If the event was accidentally moved, restore it to the correct archive month.
- If the receipt is orphaned and the event cannot be recovered, document the orphan before changing or quarantining it.

### `receipt_event_digest_mismatch`

Meaning: the receipt points to an archived event, but the archived event bytes no longer match the digest stored in the receipt.

Operator response:

- Treat this as a high-signal integrity finding.
- Compare recent Git history for the archived event and receipt.
- If the archived event was intentionally migrated without changing semantics, update the receipt `event_digest_sha256`, `receipt_id`, and filename together so they reflect the current event digest.
- If the archived event changed semantically, do not rewrite the receipt until the change is reviewed and documented.
- Write a report in `operations/docs/reports/` for any digest repair.

### `receipt_event_metadata_mismatch`

Meaning: receipt fields such as `event_type`, `correlation_id`, `idempotency_key`, systems, or `classification` no longer match the archived event.

Operator response:

- Inspect both files.
- Prefer repairing the receipt if it clearly contains stale copied metadata.
- Prefer restoring the archived event if the event was edited incorrectly.
- Re-run replay integrity and the control-plane check.

### `receipt_event_file_path_mismatch`

Meaning: the receipt replays cleanly by `event_id` and digest, but `event_file` does not point to the archive file resolved by the checker.

Severity: warning.

Operator response:

- Confirm the archive file exists and digest matches.
- If the path is stale because of a restore or migration, update `event_file` when convenient.
- Do not treat path mismatch alone as delivery failure.

## Repair Discipline

- Prefer adding a short report under `operations/docs/reports/` for every replay repair.
- Keep repairs narrow: change only the malformed event or receipt fields.
- Re-run:

```bash
node operations/bin/check-event-replay-integrity.mjs
node operations/bin/check-event-ledger.mjs
node operations/bin/check-runtime-control-plane.mjs
```

- Commit replay repairs separately from unrelated automation or UI changes.
