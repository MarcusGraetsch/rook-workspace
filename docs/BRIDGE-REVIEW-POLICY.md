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

Reviewer allowlist:

```bash
python3 /root/.openclaw/workspace/operations/bin/validate-rook-hermes-bridge-message.py \
  --require-review-approved \
  --reviewer-allowlist /root/.openclaw/workspace/operations/config/rook-hermes-bridge-reviewers.json \
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

Manifest inspection:

```bash
python3 /root/.openclaw/workspace/operations/bin/inspect-rook-hermes-bridge-archive-manifest.py \
  /path/to/archive-manifest.jsonl
```

Filter by `message_id` or reviewer:

```bash
python3 /root/.openclaw/workspace/operations/bin/inspect-rook-hermes-bridge-archive-manifest.py \
  --message-id 2026-05-08T15-00-00Z-rook-001 \
  /path/to/archive-manifest.jsonl
```

For safe testing against a temporary archive target:

```bash
ROOK_HERMES_BRIDGE_ARCHIVE_DIR=/tmp/rook-hermes-bridge-archive-test \
/root/.openclaw/workspace/operations/bin/archive-reviewed-rook-hermes-bridge-message.sh \
  /path/to/bridge-message.json
```

## Policy Level

Current enforcement level:

- `mandatory` for reviewed archive promotion
- `recommended` for all other bridge payloads
- `out-of-scope` for live delivery gating

This means:

- any structured payload promoted into durable shared context MUST carry `review_status=approved`, a valid `reviewed_by` identity, and pass the reviewer allowlist check
- the archival gate (`gate-rook-hermes-bridge-archive.sh`) now enforces this by default and will reject unreviewed or unapproved payloads
- live delivery itself remains intentionally ungated; review and archival happen before the delivery boundary, not at runtime
- operators can still use the review wrapper and validator for optional pre-checks on non-archival payloads
- if a payload is reviewed but the reviewer identity is not on the allowlist, the gate will reject it

### Allowlist Governance

Changes to `operations/config/rook-hermes-bridge-reviewers.json` are governance changes and require:

1. a separate commit with a clear rationale in the commit message
2. explicit approval by `human-marcus` (the only current allowlist authority)
3. no self-approval by the party proposing the change

Process:

- open a change proposal (commit or PR)
- describe why the reviewer ID is being added or removed
- wait for explicit ack from `human-marcus`
- merge only after ack
- backport to any other environments that share the same allowlist baseline

This keeps reviewer identity human-governed even though the runtime check is now automatic.

## Future Tightening Path

Possible next steps:

1. require successful validation before archival
2. require successful validation before delivery to the peer system
3. add metadata fields for:
   - `reviewed_by`
   - `reviewed_at`
   - `review_status`

## Retention Baseline

Recommended baseline for reviewed bridge archives:

- keep reviewed payload files and `archive-manifest.jsonl` together in the same archive target
- retain at least 30 days for routine operational review
- retain up to 90 days where architectural or audit traceability matters
- review and prune intentionally; do not silently delete ad hoc
- if pruning payload files, keep enough manifest history to preserve minimal audit traceability

## Ownership And Cadence

Recommended operational ownership:

- `reviewed_by` identifies the approving operator for the payload itself
- bridge archive hygiene should be owned by the technical control plane operator role
- private-context boundary questions should be escalated before archival or pruning, not after

Recommended cadence:

- weekly review of newly archived bridge payloads where bridge traffic is active
- monthly retention review for reviewed archive targets
- ad hoc review after incidents, architecture changes, or boundary mistakes

Reviewer identity baseline:

- keep reviewer identities in `operations/config/rook-hermes-bridge-reviewers.json`
- use stable role-style reviewer IDs, not ad hoc free-text names
- add new reviewer IDs intentionally and review them like any other governance change

Allowlist governance baseline:

- changes to `operations/config/rook-hermes-bridge-reviewers.json` should be treated as governance changes
- prefer focused review and separate commits for allowlist edits
- document the reason whenever a reviewer ID is added or removed
- avoid one-off personal aliases when a stable operator role ID is sufficient

Pruning stance:

- use a plan-first workflow
- inspect candidates before any deletion or relocation
- do not automate deletion until retention ownership is stable

## Prune Planning

Generate a non-destructive prune plan from an archive target:

```bash
python3 /root/.openclaw/workspace/operations/bin/plan-rook-hermes-bridge-archive-prune.py \
  /path/to/reviewed-archive-dir
```

Override the retention window for planning:

```bash
python3 /root/.openclaw/workspace/operations/bin/plan-rook-hermes-bridge-archive-prune.py \
  --retain-days 45 \
  /path/to/reviewed-archive-dir
```
