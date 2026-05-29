# Event Ledger Contract Hardening

Date: 2026-05-29T16:29:02Z

Scope: Rook/OpenClaw operations event ledger, Rook/Hermes bridge contract, task-event producer, queue processor, regression fixtures, and existing event archive compatibility.

## Lagebild

`/root/.openclaw/workspace` remains the canonical Git-backed coordination repo. The active operations model already has a JSON event ledger under `operations/events/` with schema validation, inbox/outbox queues, archive, receipts, dead-letter handling, and a supervised outbox dispatcher. Dashboard SQLite and runtime files remain projections or caches, not the source of truth.

The current event bridge is the right first target for the broader architecture-hardening plan because it already controls the Rook/OpenClaw and Hermes/Phoenix boundary. Strengthening this contract avoids adding another state path while making cross-system exchange more explicit and replayable.

## Befunde

- The event schema already required `event_id`, `correlation_id`, `idempotency_key`, `classification`, and `ttl_hours`, but did not expose the message-oriented `message_id` required by the bridge plan.
- Queue processing validated schema and idempotency, but a valid event whose TTL had already expired could still be archived and delivered.
- Two existing archived events predated the new `message_id` field. Without a small compatibility migration, they would no longer validate against the hardened contract.
- Inbox and outbox were empty during implementation, so no live queued event required migration.

## Arbeitsplan

1. Harden the event schema and validator with a required `message_id` field.
2. Keep `message_id` equal to `event_id` for the current v1 ledger to avoid competing identifiers.
3. Add TTL expiry enforcement before archive or delivery.
4. Extend event-ledger regression coverage for TTL dead-lettering.
5. Update documentation and migrate the two archived compatibility records.
6. Validate with event checks and the aggregate runtime control-plane check.

## Umgesetzte Änderungen

- `operations/schemas/rook-hermes-event.schema.json`
  - Added required `message_id` with the same identifier pattern as `event_id`.
- `operations/bin/validate-event.mjs`
  - Requires `message_id`.
  - Enforces `message_id === event_id` for the current event-ledger message contract.
- `operations/bin/emit-task-event.mjs`
  - Emits `message_id` for new task status events.
- `operations/bin/process-events.mjs`
  - Sends events to dead-letter when `created_at + ttl_hours` is already expired.
- `operations/bin/check-event-ledger.mjs`
  - Added a regression check for expired TTL dead-letter behavior.
- `operations/tests/events/fixtures/*.json`
  - Added `message_id` to existing fixtures.
  - Added `expired-event.json`.
- `operations/events/README.md`
  - Documented `message_id`, TTL expiry behavior, and required event contract fields.
- `operations/events/archive/2026/05/*.json`
  - Added `message_id` to the two existing archived events so current archived records still validate.

## Validierung

- `node operations/bin/check-event-ledger.mjs`
  - Passed, including valid/invalid fixtures, archive movement, dead-letter movement, duplicate idempotency rejection, TTL expiry dead-lettering, task event production, summary, receipts, and dispatcher delivery.
- `node operations/bin/validate-event.mjs operations/tests/events/fixtures/valid-event.json`
  - Passed.
- `node operations/bin/emit-task-event.mjs --task-id ops-0049 --status-before review --status-after done --dry-run`
  - Passed and produced an event containing matching `event_id` and `message_id`.
- `for f in operations/events/archive/2026/05/*.json; do node operations/bin/validate-event.mjs "$f"; done`
  - Passed for both archived events.
- `node operations/bin/check-runtime-control-plane.mjs`
  - Passed with `ok: true`, `warning_count: 0`, `error_count: 0`.

## Open Risks

- The event schema still uses `schema_version: rook-hermes-event.v1`; the new field is a contract hardening inside v1 rather than a formal version bump.
- Receipts still reference `event_id` only. That is acceptable while `message_id` mirrors `event_id`, but a future divergent message ID would require receipt-schema updates.
- TTL handling is enforced at queue-processing time. Dashboard summaries do not yet classify pending events by expiry risk before dispatcher execution.

## Nächste Schritte

1. Add event-ledger status fields for `expired_pending` and `oldest_pending_age` to support dashboard diagnosis.
2. Extend task status writeback so status changes can emit events automatically from the canonical task path, not only from the CLI helper.
3. Add a small replay/check command that validates archive records and receipts together.
4. Wire event-dispatcher health into the dashboard diagnostics panel with last run, delivered count, dead-letter count, and last failure reason.
