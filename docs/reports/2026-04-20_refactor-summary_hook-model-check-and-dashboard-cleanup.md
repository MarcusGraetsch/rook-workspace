# Hook Model Check Alignment And Dashboard Cleanup

Date: 2026-04-20
Scope: control-plane contract checks and local dashboard workspace hygiene

## Findings

- The remaining control-plane warning was `dispatcher_hook_model_not_provider_qualified`.
- That warning no longer matched the documented operating model:
  - worker defaults live under `agents.defaults.model.primary`
  - dispatcher hook execution may intentionally use a provider-specific variant of the same model family
- In parallel, the `engineering/rook-dashboard` submodule had local residue:
  - uncommitted edits in `src/app/api/agent/stats/route.ts`
  - an untracked endpoint under `src/app/api/canonical/tasks/route.ts`
- Those dashboard changes were not part of the durable repo state and should not remain as ambient local drift.

## Actions Taken

- Cleaned the dashboard submodule worktree:
  - reverted local edits in `engineering/rook-dashboard/src/app/api/agent/stats/route.ts`
  - removed the untracked local-only endpoint `engineering/rook-dashboard/src/app/api/canonical/tasks/route.ts`
- Updated the contract heuristics in:
  - `operations/bin/check-openclaw-contract.mjs`
  - `operations/bin/check-runtime-control-plane.mjs`
- Added model-compatibility logic so the checks accept dispatcher hook models that:
  - are exactly equal to the default worker model, or
  - use the same model name with the compatible `minimax` / `minimax-portal` provider pair

## Validation

- `git -C engineering/rook-dashboard status --short --branch`
  - result: clean worktree, branch still `main...origin/main [ahead 11]`
- `node operations/bin/check-openclaw-contract.mjs`
  - result: `warning_count: 0`
- `node operations/bin/check-runtime-control-plane.mjs`
  - result:
    - `warning_count: 0`
    - all operational checks green
- Reviewed the diff for the two contract-check scripts.

## Open Risks

- The dashboard repo is clean locally now, but it is still `ahead 11`; that is expected repo state, not a dirtiness problem.
- The remaining findings are informational posture acknowledgements only:
  - Telegram group allowlist intentionally empty
  - loopback-only insecure gateway auth explicitly acknowledged

## Next Steps

1. If desired, review whether the runtime/operator docs should be tightened so they describe the current live dispatcher hook model more precisely.
2. If you want to continue beyond cleanup, the next worthwhile step is an upstream/upgrade guardrail pass rather than more runtime hygiene work.
