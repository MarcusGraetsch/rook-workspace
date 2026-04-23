# Refactor Summary: Control-Plane Stale `main` Reference Alignment

- Date: 2026-04-23
- Scope: `operations/bin/check-runtime-control-plane.mjs`

## Findings

- `check-stale-agent-dirs.mjs` and `check-runtime-control-plane.mjs` disagreed on active references for the stale `agents/main` runtime directory.
- The standalone stale-agent check already treats `main` as a special case and does not count generic quoted `"main"` or `'main'` strings as agent references.
- The aggregate control-plane check still used the older broad matcher, causing false `active_workspace_references` blockers for normal branch/default-branch text.

## Actions Taken

- Aligned `check-runtime-control-plane.mjs` with the standalone stale-agent check.
- For `agentId === "main"`, the aggregate check now only treats these patterns as references:
  - `/root/.openclaw/agents/main`
  - `agents/main`
  - `agent:main:`
- Generic quoted `"main"` and `'main'` are still used for other agent ids, but not for the special legacy `main` pseudo-agent.

## Validation

- `node operations/bin/check-stale-agent-dirs.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Expected result:

- both checks now agree that `agents/main` has `blocking_reference_count: 0`
- the remaining archive blocker is the on-disk `agent_subdir_present`

## Open Risks

- `/root/.openclaw/agents/main` still exists and has recent runtime activity from 2026-04-23, so it should not be archived blindly in this change.
- The root cause of why `agents/main` reappeared after earlier archival still needs investigation before cleanup.

## Next Steps

1. Inspect what created or touched `/root/.openclaw/agents/main` on 2026-04-23.
2. Only archive it after confirming no current process depends on the directory.
