# Session Review: Bridge Reviewer Allowlist and Live Workflow Candidate

Date: 2026-05-08
Scope: `rook-workspace` bridge reviewer identity rules and candidate mandatory archival workflow

## Lagebild

The bridge governance path already had approval metadata, archival gating, reviewed archive flows, manifesting, retention guidance, and operator runbooks.

This phase adds:

- a reviewer allowlist configuration
- validator support for allowlist enforcement
- a clearer statement of which real workflow is the best candidate for mandatory archival approval

## Befunde

1. `reviewed_by` had policy guidance but not yet a stable machine-readable reviewer set.
2. The safest workflow candidate for mandatory approval is reviewed archive promotion, not live delivery.
3. Constraining reviewer identity at gate time improves trust without changing runtime message flow.

## Arbeitsplan

1. add a reviewer allowlist config
2. teach validator and archive gate to use it
3. document the canonical workflow candidate and reviewer rules
4. validate positive and negative allowlist behavior

## Umgesetzte Änderungen

- added `operations/config/rook-hermes-bridge-reviewers.json`
- updated `operations/bin/validate-rook-hermes-bridge-message.py`
- updated `operations/bin/gate-rook-hermes-bridge-archive.sh`
- updated `docs/BRIDGE-REVIEW-POLICY.md`
- updated `docs/BRIDGE-ARCHIVE-OPERATOR-RUNBOOK.md`
- updated `docs/ROOK-HERMES-INTEGRATION-CONTRACT.md`

## Validierung

Checked:

- validator success for the approved example with the allowlist
- expected validator failure for a payload with an unapproved reviewer ID
- archive gate success for the approved example with the default allowlist path

Not checked:

- live runtime delivery path changes
- dynamic reviewer identity provisioning

## Open Risks

- reviewer identity is role-constrained but still file-backed, not identity-provider backed
- the mandatory workflow is now formally adopted for archive promotion
- allowlist maintenance needs human discipline and explicit `human-marcus` approval
- live delivery remains out of scope for gating

## Nächste Schritte

1. ✅ reviewed archive promotion is now formally mandatory gated workflow
2. ✅ allowlist changes require explicit `human-marcus` approval via separate commit/PR
3. ✅ live delivery stays out of scope until there is stronger operational confidence
