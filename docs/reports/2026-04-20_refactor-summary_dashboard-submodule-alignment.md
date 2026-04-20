# Dashboard Submodule Alignment

Date: 2026-04-20
Scope: `workspace` submodule pointer for `engineering/rook-dashboard`

## Findings

- The dashboard repository itself was clean after removing local-only residue, but the `workspace` superproject still showed `engineering/rook-dashboard` as modified.
- The cause was not a dirty worktree inside the dashboard repo. It was a submodule pointer mismatch:
  - `workspace` expected `000f816`
  - the live checked-out dashboard repo was already at `c976039`
- The checked-out dashboard history ahead of the superproject pointer consisted of the diagnostics/health work that is now part of the live local dashboard state.

## Actions Taken

- Verified the dashboard repo worktree was clean.
- Verified the exact submodule drift with `git diff --submodule=log -- engineering/rook-dashboard`.
- Updated the `workspace` superproject to point at the currently checked-out clean dashboard commit `c976039`.

## Validation

- `git -C engineering/rook-dashboard status --short --branch`
  - result: clean worktree on `main...origin/main [ahead 11]`
- `git diff --submodule=log -- engineering/rook-dashboard`
  - confirmed the precise pointer drift before alignment
- After staging the submodule pointer, `workspace` no longer treats `engineering/rook-dashboard` as an unexplained dirty path.

## Open Risks

- The dashboard repo is still locally ahead of `origin/main` by 11 commits. This is not a dirtiness problem, but it does mean the superproject now intentionally references a local dashboard commit that is not yet pushed upstream.

## Next Steps

1. If the dashboard local history is meant to be preserved durably, review and push it from the dashboard repo in a separate publishing step.
2. Keep the `workspace` submodule pointer aligned with the deployed dashboard revision so the superproject reflects real live state instead of stale references.
