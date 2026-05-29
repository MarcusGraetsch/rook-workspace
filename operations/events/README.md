# Operations Event Ledger

This directory is the Git-backed scaffold for the Rook/OpenClaw and Hermes/Phoenix JSON event bridge.

## Purpose

- Replace direct markdown file exchange with immutable JSON events.
- Preserve the OpenClaw/Hermes privacy boundary.
- Make state synchronization idempotent, inspectable, and safe to replay.

## Structure

```text
events/
├── archive/
├── inbox/
├── outbox/
├── receipts/
└── dead-letter/
```

## Rules

1. Events must validate against `operations/schemas/rook-hermes-event.schema.json`.
2. Every event requires `event_id`, `message_id`, `correlation_id`, `idempotency_key`, `classification`, and `ttl_hours`.
3. Only `bridge-safe`, `ops-internal`, or `private-redacted` events may enter this ledger.
4. Health, psyche, and private journaling material must not be copied into bridge payloads.
5. Event consumers must treat `idempotency_key` as the deduplication key.
6. `message_id` currently mirrors `event_id`; both are required so message-oriented bridges and event-oriented tooling refer to the same immutable record.
7. Expired events move to `dead-letter/` instead of being archived or dispatched.
8. Failed events move to `dead-letter/` with failure metadata; they are never silently deleted.
9. Processed valid events move to `archive/YYYY/MM/` and remain replayable.
10. Delivery and consumption acknowledgements are written as immutable receipt files under `receipts/YYYY/MM/`; original events are not modified after emission.
11. Receipts must conform to `operations/schemas/rook-hermes-receipt.schema.json` and replay cleanly against archived events via `operations/bin/check-event-replay-integrity.mjs`.

## Processing

Validate one event:

```bash
node operations/bin/validate-event.mjs operations/events/inbox/<event>.json
```

Process a queue without mutating files:

```bash
node operations/bin/process-events.mjs --queue inbox --dry-run
```

Process a queue:

```bash
node operations/bin/process-events.mjs --queue inbox
```

For isolated tests, set `ROOK_EVENTS_DIR` to a temporary directory with `inbox/`, `outbox/`, `archive/`, and `dead-letter/` children.

Run fixture-based regression checks:

```bash
node operations/bin/check-event-ledger.mjs
```

Validate archive and receipt replay integrity:

```bash
node operations/bin/check-event-replay-integrity.mjs
```

Summarize queue status:

```bash
node operations/bin/summarize-events.mjs
```

Write an acknowledgement receipt for an archived or queued event:

```bash
node operations/bin/ack-event.mjs \
  --event-id evt_20260527_fixture_valid_0001 \
  --system hermes \
  --state acked
```

Dispatch a queue by archiving valid events and writing delivered receipts:

```bash
node operations/bin/dispatch-events.mjs --queue outbox --dry-run
node operations/bin/dispatch-events.mjs --queue outbox
```

Emit a task-state event into the outbox:

```bash
node operations/bin/emit-task-event.mjs \
  --task-id ops-0049 \
  --status-before in_progress \
  --status-after review
```

Preview without writing:

```bash
node operations/bin/emit-task-event.mjs \
  --task-id ops-0049 \
  --status-before review \
  --status-after done \
  --dry-run
```
