# Runtime Control Plane Check

Date: 2026-04-18
Scope: aggregated operator diagnostics and repo-vs-live systemd drift in `/root/.openclaw/workspace`

## Summary

This session added a single aggregated operator check:

- `operations/bin/check-runtime-control-plane.mjs`

The script produces one JSON report for:

- OpenClaw contract posture
- runtime posture warnings
- runtime/canonical task-state coverage mismatches
- runtime-only task overlays
- stale agent directories
- task-agent binding anomalies
- repo-vs-installed user `systemd` drift for the critical runtime units

## Why

The system already had several useful point diagnostics, but operators had to know and run them one by one.

That created two problems:

1. drift stayed invisible unless the operator remembered the full checklist
2. repo-vs-live unit divergence could survive until the next maintenance resync

The new aggregate check shortens the operator path from “something feels off” to “here are the concrete mismatches”.

## Changes

Changed:

- `operations/bin/check-runtime-control-plane.mjs`
- `operations/systemd/rook-dispatcher.timer`
- `docs/RUNTIME-OPERATIONS.md`
- `docs/OPENCLAW-UPGRADE-GUIDE.md`

## Key Findings From The New Check

The new check currently reports these live warnings:

- stale unbound agent dir: `agents/main`
- telegram group allowlist is enabled but no groups are configured
- gateway control UI still allows insecure auth on loopback
- repo copy of `rook-dispatcher.timer` had drifted from the installed user unit
- runtime-only task overlays still exist for:
  - `rook-agent/agent-0001.json`
  - `rook-workspace/ops-0014.json`
  - `rook-workspace/ops-0034.json`

## Timer Drift Repair

The aggregate check exposed a second repo-vs-live drift:

- installed `~/.config/systemd/user/rook-dispatcher.timer` was already running every `15s`
- repo copy `operations/systemd/rook-dispatcher.timer` still said `5min`

That mismatch mattered for the same reason as the earlier dispatcher model drift:

- any future user-unit resync from the repo would silently revert the live runtime cadence

The repo copy now matches the installed runtime timer cadence.

## Validation

Executed:

- `node operations/bin/check-runtime-control-plane.mjs`
- `diff -u /root/.openclaw/workspace/operations/systemd/rook-dispatcher.timer /root/.config/systemd/user/rook-dispatcher.timer`

Validated outcome:

- aggregated check runs successfully
- it returns structured warnings instead of wrapper failures
- `rook-dispatcher.timer` repo copy now matches the installed user unit

## Open Follow-Ups

1. decide whether `15s` remains the intended dispatcher cadence or whether it should become configurable in one place
2. define a cleanup policy for runtime-only overlays
3. decide whether stale agent archival checks should ignore report-only references under `docs/reports/`
