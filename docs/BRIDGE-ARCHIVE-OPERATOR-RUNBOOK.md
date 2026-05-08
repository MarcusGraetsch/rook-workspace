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

## Reviewer Allowlist Governance

- reviewer IDs live in `operations/config/rook-hermes-bridge-reviewers.json`
- treat allowlist changes as explicit governance changes
- keep those edits focused and reviewable
- record why a reviewer ID was added or removed in the same change set or report

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

## Canonical Workflow Candidate

Recommended candidate for mandatory archival approval:

- any payload promoted into the reviewed bridge archive should go through
  `archive-reviewed-rook-hermes-bridge-message.sh`
- that flow already passes through
  `gate-rook-hermes-bridge-archive.sh`
- the gate should use the reviewer allowlist from
  `operations/config/rook-hermes-bridge-reviewers.json`

This is the best current candidate because:

- it is operationally real
- it is narrow in scope
- it does not rewrite live delivery paths
- it upgrades archival trust without destabilizing runtime behavior

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
