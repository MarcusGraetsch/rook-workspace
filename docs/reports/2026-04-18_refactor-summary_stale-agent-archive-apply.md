# Stale Agent Archive Apply

Date: 2026-04-18
Scope: applying the archival move for the stale `main` agent directory

## Summary

After the dry-run package, `agents/main` was archived with the new operator script.
The full directory was moved from:

- `/root/.openclaw/agents/main`

to:

- `/root/.openclaw/runtime/archive/stale-agents/main-2026-04-18T17-45-46-477Z`

This preserved:

- the legacy `agent/` payload
- the `sessions/` store
- reset and deleted session artifacts
- an `ARCHIVE-METADATA.json` manifest written at archive time

## Why This Was Safe Enough

- `main` was no longer configured in `openclaw.json`
- no active tracked workspace references remained
- the move was reversible because the directory was relocated, not deleted
- runtime-only task state and systemd drift had already been cleaned up earlier in the session

## Commands Executed

- `node operations/bin/archive-stale-agent-dir.mjs --agent main`
- `node operations/bin/archive-stale-agent-dir.mjs --agent main --apply`
- `node operations/bin/check-stale-agent-dirs.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

## Validation

Observed after the archive move:

- `/root/.openclaw/agents/` no longer contains `main`
- `/root/.openclaw/runtime/archive/stale-agents/` contains the archived `main` directory and metadata
- `check-stale-agent-dirs.mjs` reports `stale_agent_count: 0`
- `check-runtime-control-plane.mjs` reports:
  - `ok: true`
  - `warning_count: 2`
  - remaining warnings only:
    - `telegram_group_allowlist_empty`
    - `gateway_insecure_auth_enabled`

## Open Follow-Up

The remaining control-plane issues are now policy and security posture questions, not stale runtime-state cleanup:

1. keep or populate the Telegram allowlist
2. keep or harden `gateway.controlUi.allowInsecureAuth`
