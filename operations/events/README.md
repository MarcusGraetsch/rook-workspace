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
2. Every event requires `event_id`, `correlation_id`, `idempotency_key`, and `classification`.
3. Only `bridge-safe`, `ops-internal`, or `private-redacted` events may enter this ledger.
4. Health, psyche, and private journaling material must not be copied into bridge payloads.
5. Event consumers must treat `idempotency_key` as the deduplication key.
6. Failed events move to `dead-letter/` with failure metadata; they are never silently deleted.
7. Processed valid events move to `archive/YYYY/MM/` and remain replayable.
8. Delivery and consumption acknowledgements are written as immutable receipt files under `receipts/YYYY/MM/`; original events are not modified after emission.

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
