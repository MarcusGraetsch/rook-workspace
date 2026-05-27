# Operations Event Ledger

This directory is the Git-backed scaffold for the Rook/OpenClaw and Hermes/Phoenix JSON event bridge.

## Purpose

- Replace direct markdown file exchange with immutable JSON events.
- Preserve the OpenClaw/Hermes privacy boundary.
- Make state synchronization idempotent, inspectable, and safe to replay.

## Structure

```text
events/
├── inbox/
├── outbox/
└── dead-letter/
```

## Rules

1. Events must validate against `operations/schemas/rook-hermes-event.schema.json`.
2. Every event requires `event_id`, `correlation_id`, `idempotency_key`, and `classification`.
3. Only `bridge-safe`, `ops-internal`, or `private-redacted` events may enter this ledger.
4. Health, psyche, and private journaling material must not be copied into bridge payloads.
5. Event consumers must treat `idempotency_key` as the deduplication key.
6. Failed events move to `dead-letter/` with failure metadata; they are never silently deleted.
