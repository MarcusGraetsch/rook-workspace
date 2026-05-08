# Rook Hermes Integration Contract

> Status: v1 draft
> Last updated: 2026-05-08
> Scope: safe collaboration contract between the technical control plane and the reflective private assistant plane

## Purpose

Rook/OpenClaw and Hermes/Phoenix are not duplicates.

They should collaborate as two distinct system roles:

- `Rook/OpenClaw`
  - execution, engineering, operations, technical orchestration
- `Hermes/Phoenix`
  - reflection, care, creativity, personal support

The goal is selective collaboration without uncontrolled state fusion.

## Contract Principles

1. No silent full-context sharing.
2. Shared artifacts must be explicitly classified.
3. Private context remains private by default.
4. Professional delivery state belongs to the OpenClaw control plane.
5. File-bridge payloads must be treated as durable artifacts, not casual chat.

## Data Classes

Use these four classes for all cross-system exchange:

- `private`
  - personal, intimate, or high-sensitivity context
  - default deny for Rook unless explicitly released
- `professional`
  - work, architecture, operations, repo, or delivery state
  - default deny for Hermes unless needed for a bounded task
- `public`
  - publishable or already published material
  - safe to mirror if still relevant
- `bridge-safe`
  - explicitly approved summary or request payload for cross-system handoff

## Allowed Cross-System Flows

### Hermes -> Rook

Allowed when payload is `bridge-safe` and one of:

- operational question that needs technical action
- summarized personal instruction that affects work planning
- curated context for a defined task

Not allowed by default:

- raw private session dumps
- full personal history
- broad auth or account state

### Rook -> Hermes

Allowed when payload is `bridge-safe` and one of:

- bounded technical update that affects personal planning
- question where reflective or interpersonal input is useful
- curated status summary for shared awareness

Not allowed by default:

- raw infrastructure logs unless explicitly requested
- broad technical transcript dumps
- secrets or credentials

## Message Schema v1

Recommended fields for every bridge artifact:

```json
{
  "message_id": "uuid-or-timestamp-id",
  "source_system": "rook|hermes",
  "target_system": "hermes|rook",
  "created_at": "ISO-8601",
  "classification": "bridge-safe",
  "topic": "short-slug",
  "purpose": "question|summary|request|handoff",
  "allowed_consumers": ["rook"] ,
  "ttl_hours": 72,
  "body": "sanitized content",
  "references": []
}
```

Reference schema:

- `operations/schemas/rook-hermes-bridge-message.schema.json`
- `operations/templates/rook-hermes-bridge-message.example.json`
- `operations/bin/validate-rook-hermes-bridge-message.py`
- `operations/bin/review-rook-hermes-bridge-message.sh`

## Persistence Rules

Bridge storage locations such as `rook-phoenix-comm` and `sync-bridge` are durable.

Therefore:

1. Every payload should be written as if it may be audited later.
2. No secrets belong in bridge files.
3. No raw private session exports belong in bridge files.
4. Archive retention should exist and be documented.

## Ownership Rules

- Technical delivery truth:
  - `rook-workspace` canonical tasks and runtime state
- Personal reflective truth:
  - Hermes local memory and session state
- Shared truth:
  - only curated `bridge-safe` summaries and decisions

## Operational Safeguards

1. Keep bridge jobs asynchronous.
2. Preserve loop prevention.
3. Add message IDs and idempotent processing.
4. Add retention review for archived bridge artifacts.
5. Add a human-readable header stating classification and intended use.

## Near-Term Implementation Steps

1. Introduce a canonical bridge template file.
2. Add `classification`, `message_id`, and `ttl_hours` to all new bridge payloads.
3. Distinguish `personal-reflection` from `technical-handoff` in filenames or metadata.
4. Add periodic review of bridge archives.

## Validation Command

```bash
python3 /root/.openclaw/workspace/operations/bin/validate-rook-hermes-bridge-message.py \
  /root/.openclaw/workspace/operations/templates/rook-hermes-bridge-message.example.json
```

Review-hook style wrapper:

```bash
/root/.openclaw/workspace/operations/bin/review-rook-hermes-bridge-message.sh \
  /path/to/bridge-message.json
```
