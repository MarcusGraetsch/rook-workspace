# Metrics Collector Submodule Initialization

Date: 2026-04-20
Scope: `engineering/metrics-collector` submodule state in `rook-workspace`

## Findings

- `git submodule status` showed:
  - `-b4ba85b... engineering/metrics-collector`
- The path was not missing. It was a real local repo checked out at the exact commit recorded by the superproject.
- The problem was that the superproject had not registered/initialized the submodule in its local config, so Git still reported it with the leading `-`.
- This created avoidable ambiguity in upgrade/maintenance review because it looked like a missing submodule even though the code was present.

## Actions Taken

- Confirmed the path was a real repo with:
  - matching `HEAD`
  - valid remote
  - clean worktree
- Normalized the gitdir using:
  - `git submodule absorbgitdirs -- engineering/metrics-collector`
- Registered the submodule explicitly in the superproject with:
  - `git submodule init engineering/metrics-collector`
- Updated `docs/OPENCLAW-UPGRADE-GUIDE.md` with:
  - interpretation of `git submodule status` prefixes
  - the concrete repair command for a required submodule that still shows `-`

## Validation

- Before repair:
  - `git submodule status` showed `-b4ba85b... engineering/metrics-collector`
- After repair:
  - `git submodule status` showed ` b4ba85b... engineering/metrics-collector (heads/main)`
- `git -C engineering/metrics-collector status --short --branch`
  - result: clean worktree on `main...origin/main`

## Open Risks

- The initialization state is local workspace metadata, not a tracked repo file, so another fresh clone can still hit the same ambiguity until the documented init step is followed.

## Next Steps

1. Keep using `git -C /root/.openclaw/workspace submodule status` as part of upgrade review.
2. If more submodules ever show a leading `-`, treat that first as an initialization/registration question before assuming content drift.
