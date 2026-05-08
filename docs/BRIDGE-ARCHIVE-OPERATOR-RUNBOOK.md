# Bridge Archive Operator Runbook

Date: 2026-05-08
Scope: reviewed Rook/Hermes bridge archive review, inspection, and prune planning

## Purpose

This runbook defines the minimum safe operator workflow for reviewed bridge archives.

It is intentionally:

- non-destructive by default
- review-first
- suitable for audit-sensitive bridge payloads

## Ownership

- payload approval owner:
  - the operator named in `reviewed_by`
- archive hygiene owner:
  - the technical control plane operator role
- escalation owner for boundary mistakes:
  - the same operator role, with private-context escalation before any pruning decision

## Weekly Review

1. Inspect the manifest summary:

```bash
python3 /root/.openclaw/workspace/operations/bin/inspect-rook-hermes-bridge-archive-manifest.py \
  /path/to/archive-manifest.jsonl
```

2. Inspect focused subsets when needed:

```bash
python3 /root/.openclaw/workspace/operations/bin/inspect-rook-hermes-bridge-archive-manifest.py \
  --reviewed-by rook-operator \
  /path/to/archive-manifest.jsonl
```

3. Check whether reviewed payloads still belong in durable shared context.

## Monthly Retention Review

1. Generate a prune plan:

```bash
python3 /root/.openclaw/workspace/operations/bin/plan-rook-hermes-bridge-archive-prune.py \
  /path/to/reviewed-archive-dir
```

2. Review candidate age, reviewer, and file existence.
3. Decide whether any candidate should later be relocated or deleted in a separate, explicitly approved workflow.

## Incident Or Boundary Review

Run an extra review when:

- a bridge payload crossed the wrong context boundary
- a payload contained overshared technical or personal material
- archive ownership or reviewer identity is unclear

In these cases:

1. inspect matching entries by `message_id`
2. inspect matching entries by `reviewed_by`
3. avoid deletion until the incident decision trail is documented

## Guardrails

- do not delete from reviewed bridge archives during routine inspection
- use plan-first workflows only
- do not treat manifest history as harmless noise; it is part of the audit trail
- if a destructive cleanup path is ever introduced later, require separate approval and documentation
