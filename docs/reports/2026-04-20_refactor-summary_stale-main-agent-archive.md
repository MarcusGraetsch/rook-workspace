# Stale `main` Agent Archive

Date: 2026-04-20
Scope: stale-agent diagnostics, archival readiness, and runtime cleanup for `agents/main`

## Findings

- `agents/main` had reappeared as an unbound runtime residue even though `main` is no longer configured in `openclaw.json`.
- The stale-agent diagnostics were over-reporting blockers because the reference matcher treated the generic quoted token `"main"` as if it were an agent reference.
- That caused branch metadata and PR base-branch strings to be counted as active blockers for `agents/main`, even though they had nothing to do with the stale agent directory.

## Actions Taken

- Narrowed the tracked-reference matcher for stale-agent tooling:
  - `operations/bin/check-stale-agent-dirs.mjs`
  - `operations/bin/archive-stale-agent-dir.mjs`
- For the special case `agentId === "main"`, the tools now only match:
  - `/root/.openclaw/agents/main`
  - `agents/main`
  - `agent:main:`
- They no longer treat every quoted `"main"` token as an agent reference.
- Re-ran the stale-agent dry-run and confirmed `main` was archive-ready.
- Archived the live runtime residue:
  - from `/root/.openclaw/agents/main`
  - to `/root/.openclaw/runtime/archive/stale-agents/main-2026-04-20T17-44-30-066Z`

## Validation

- `node operations/bin/check-stale-agent-dirs.mjs`
  - before apply: `main` had `blocking_reference_count: 0`
  - after apply: `stale_agent_count: 0`
- `node operations/bin/archive-stale-agent-dir.mjs --agent main`
  - dry-run reported `full_dir_archive_readiness: ready`
- `node operations/bin/archive-stale-agent-dir.mjs --agent main --apply`
  - archived the directory into the runtime archive path above
- `node operations/bin/check-runtime-control-plane.mjs`
  - result after archival:
    - `stale_agent_dirs.warning_count: 0`
    - total `warning_count: 1`

## Open Risks

- Multiple archived `main-*` snapshots already exist under `/root/.openclaw/runtime/archive/stale-agents/`; retention/cleanup policy for repeated stale-agent archives is still undefined.
- The remaining control-plane warning is still:
  - `dispatcher_hook_model_not_provider_qualified`

## Next Steps

1. Review whether repeated `stale-agents/main-*` archive snapshots should be deduplicated or just retained as operational history.
2. Revisit the dispatcher hook-model warning and decide whether it is a true contract drift or a stale check heuristic.
