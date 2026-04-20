# Upgrade Guardrail Alignment

Date: 2026-04-20
Scope: upgrade and change-management documentation in `rook-workspace`

## Findings

- The live runtime and the contract checks were already aligned, but the upgrade documentation still described a narrower, older hook-model expectation.
- The merge/change-management docs also did not explicitly call out submodule-pointer risk, even though `engineering/rook-dashboard` is part of the deployed control plane.
- That left a gap between:
  - what the checks now accept
  - what the operator docs still told a maintainer to verify

## Actions Taken

- Updated `docs/OPENCLAW-UPGRADE-GUIDE.md` to:
  - include `git -C /root/.openclaw/workspace status --short`
  - include `git -C /root/.openclaw/workspace submodule status`
  - describe the accepted compatible dispatcher hook-model pair
  - add explicit submodule expectations for deployed revisions
  - list submodule-pointer drift as an upgrade risk
- Updated `docs/CHANGE-MANAGEMENT.md` to:
  - require `git submodule status` in merge review
  - require checking the dashboard submodule pointer against the deployed revision
  - make explicit that a submodule commit must exist on the intended remote before merge

## Validation

- `git submodule status`
  - confirmed the currently deployed dashboard pointer is visible in the superproject state
- `node operations/bin/check-runtime-control-plane.mjs`
  - remained green with `warning_count: 0`
- Reviewed the docs diff against the current live runtime shape

## Open Risks

- `engineering/metrics-collector` still appears with a leading `-` in `git submodule status`, which indicates the submodule is not fully initialized in this workspace view.
- That is not a control-plane outage today, but it is a real upgrade/maintenance sharp edge and should be treated explicitly later.

## Next Steps

1. Decide whether `engineering/metrics-collector` should be initialized, removed, or explicitly documented as optional.
2. If you want the branch ready for review, the next useful step is opening or drafting the PR with the operational summary grouped by runtime hygiene, diagnostics, and dashboard alignment.
