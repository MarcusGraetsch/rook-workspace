# Stale Agent Diagnostics Refinement

Date: 2026-04-18
Scope: `agents/main` archive-readiness diagnostics and stale-agent reference classification

## Summary

The stale-agent checks previously treated every tracked reference to a stale agent as an archive blocker.

That was too coarse.

A historical session note, a report file, and an active operations script should not all block archival in the same way.

This session refined the diagnostics so tracked references are now classified as:

- `active`
- `historical`
- `informational`

Only `active` references count as archive blockers.

## Changed

- `operations/bin/check-stale-agent-dirs.mjs`
- `operations/bin/check-runtime-control-plane.mjs`

## Classification Rule

Current policy:

- `active`
  - `workspace/operations/`
  - `workspace/tasks/`
  - `workspace/skills/`
  - `workspace/wiki/`
  - `workspace/.github/`
  - `workspace/.openclaw/`
  - `workspace/AGENTS.md`
  - `workspace/TOOLS.md`
- `historical`
  - `workspace/docs/reports/`
  - `workspace/memory/`
  - `workspace/projects/`
- `informational`
  - everything else that still matches the stale-agent pattern

## Why This Matters

Without this distinction, the stale-agent report can be self-poisoning:

- once a report mentions `agents/main`, that report itself becomes a new blocker

That behavior makes the diagnostic harder to trust and harder to act on.

The new logic preserves visibility of those references, but it no longer treats them as active archive blockers.

## Validation

Executed:

- `node operations/bin/check-stale-agent-dirs.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Observed outcome:

- `agents/main` remains correctly blocked
- the blocking reason is now narrower and more actionable
- report and memory references remain visible as non-blocking historical context

## Remaining Blockers For `agents/main`

After the refinement, the remaining archive blockers are:

- the on-disk `agent/` subdirectory still exists
- at least one active tracked reference remains under `workspace/tasks/`

That is a better signal than “some file somewhere mentioned main”.
