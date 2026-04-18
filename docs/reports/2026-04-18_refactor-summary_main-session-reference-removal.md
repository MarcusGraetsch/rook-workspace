# Main Session Reference Removal

Date: 2026-04-18
Scope: forensic session search script under `workspace/tasks/noctiluca-contact/`

## Summary

The stale-agent diagnostics still found one active reference to `agents/main` in:

- `workspace/tasks/noctiluca-contact/search_moltcities_vm.sh`

That reference was not just legacy naming noise.
It meant the forensic script only searched the old `main` session directory.

This session removed that coupling and replaced it with a scan across all agent session directories.

## Changed

- `workspace/tasks/noctiluca-contact/search_moltcities_vm.sh`

## Why

The old behavior had two problems:

1. it kept `agents/main` alive as an active dependency in diagnostics
2. it was operationally weaker because it ignored sessions from the actual current agent set

The new behavior is more correct:

- it searches every `/root/.openclaw/agents/*/sessions`
- it prints the agent name for each matching session

## Validation

Executed:

- `node operations/bin/check-stale-agent-dirs.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`
- `rg -n "/root/.openclaw/agents/main/sessions" workspace/tasks/noctiluca-contact/search_moltcities_vm.sh`

Observed result:

- the hardcoded active `agents/main` reference is gone from the script
- stale-agent diagnostics now block `agents/main` only because the on-disk agent directory still exists

## Follow-Up

The remaining blocker for archiving `agents/main` is now the runtime directory itself rather than an active tracked script dependency.
