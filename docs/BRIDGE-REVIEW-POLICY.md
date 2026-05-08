# Bridge Review Policy

> Status: Operational policy
> Last updated: 2026-05-08
> Scope: structured Rook/Hermes bridge payloads

## Goal

Ensure that structured bridge messages are:

- valid
- intentionally classified
- free of obvious secret leakage
- suitable for durable archival

## When Review Is Required

Review is required for any structured payload that is meant to cross between:

- `Rook/OpenClaw`
- `Hermes/Phoenix`

Review is strongly recommended before:

- archival
- manual forwarding
- automation that treats the payload as authoritative handoff context

## Minimum Review Steps

1. Validate schema and required fields.
2. Confirm `classification=bridge-safe`.
3. Confirm the `target_system` is present in `allowed_consumers`.
4. Check that the payload does not contain:
   - secrets
   - auth material
   - raw private session dumps
   - excessive transcript spill
5. Confirm that `topic` and `purpose` are specific enough to audit later.
6. If the payload is meant for durable archival, set:
   - `review_status=approved`
   - `reviewed_by`
   - `reviewed_at`

## Review Commands

Schema validation:

```bash
python3 /root/.openclaw/workspace/operations/bin/validate-rook-hermes-bridge-message.py \
  /path/to/bridge-message.json
```

Review wrapper:

```bash
/root/.openclaw/workspace/operations/bin/review-rook-hermes-bridge-message.sh \
  /path/to/bridge-message.json
```

Archive gate:

```bash
/root/.openclaw/workspace/operations/bin/gate-rook-hermes-bridge-archive.sh \
  /path/to/bridge-message.json
```

Archive flow:

```bash
/root/.openclaw/workspace/operations/bin/archive-reviewed-rook-hermes-bridge-message.sh \
  --dry-run \
  /path/to/bridge-message.json
```

## Policy Level

Current enforcement level:

- `recommended`
- `optional-gate` for archival readiness

This means:

- operators should review structured payloads before promoting them into durable shared context
- the runtime is not yet hard-blocking unreviewed payloads globally
- operators can already use an explicit archival gate that requires approved review metadata
- operators can archive approved payloads through an explicit copy-based flow without changing live bridge delivery

## Future Tightening Path

Possible next steps:

1. require successful validation before archival
2. require successful validation before delivery to the peer system
3. add metadata fields for:
   - `reviewed_by`
   - `reviewed_at`
   - `review_status`
