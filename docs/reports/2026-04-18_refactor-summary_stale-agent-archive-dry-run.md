# Stale Agent Archive Dry Run

Date: 2026-04-18
Scope: non-destructive archive planning for stale on-disk agent directories

## Summary

`agents/main` is now the main remaining structural legacy warning.
It is no longer referenced by active tracked operator logic, but it still exists on disk and still contains:

- an `agent/` subdirectory
- a `sessions/` store
- historical `.jsonl`, `.reset`, and `.deleted` session artifacts

This package does not archive the directory yet.
It adds an explicit operator script that plans the archive move first and requires `--apply` to perform it.

## Changed

- `operations/bin/archive-stale-agent-dir.mjs`
- `docs/RUNTIME-OPERATIONS.md`

## Policy

For stale agent directories:

- only unconfigured agent ids are eligible
- active tracked workspace references remain blockers
- default mode is dry-run
- `--apply` moves the whole agent directory into:
  - `/root/.openclaw/runtime/archive/stale-agents/<agent>-<timestamp>/`
- each archived directory receives `ARCHIVE-METADATA.json`

This keeps the cleanup reversible and forensically readable.

## Validation

Executed:

- `node operations/bin/archive-stale-agent-dir.mjs --agent main`
- `node operations/bin/check-stale-agent-dirs.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Expected outcome:

- dry-run reports `main` as ready for a full-directory archive if no active references remain
- no live filesystem mutation happens without `--apply`
- aggregate control-plane warnings remain unchanged until an explicit archive step is executed
