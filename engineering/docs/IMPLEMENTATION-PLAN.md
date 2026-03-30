# Implementation Plan

> Status: Rebased to current system state on 2026-03-30

## Completed Stabilization Work

### Task Backbone

- [x] Kanban remains the main working UI
- [x] canonical task files created under `workspace/operations/tasks/`
- [x] repo-linked tasks sync to GitHub Issues
- [x] bulk backfill completed for active board tasks
- [x] archive and restore workflow implemented

### Reliability

- [x] structured health snapshots added under `workspace/operations/health/`
- [x] old fake heartbeat cron jobs disabled
- [x] dashboard agent stats moved off the old broken gateway stats path
- [x] Discord fake subagent spawning disabled

### Documentation

- [x] system map written to `workspace/docs/SYSTEM-MAP.md`
- [x] target architecture written to `workspace/docs/TARGET-ARCHITECTURE.md`
- [x] roadmap written to `workspace/docs/ROADMAP.md`

## Active Workstreams

### 1. Documentation Cleanup

- [x] rebase engineering architecture docs
- [x] document Discord operating policy
- [x] write disaster recovery runbook

### 2. Dashboard Control-Plane Maturity

- [x] GitHub issue diagnostics
- [x] health snapshot UI
- [x] branch/commit/PR visibility
- [ ] blocked/dependency views
- [ ] clearer retry/error surfaces

### 3. Runtime Cleanup

- [x] fully deprecate old heartbeat docs/scripts
- [ ] normalize role workspaces
- [ ] clean up remaining legacy dashboard routes

### 4. Security and Recovery

- [ ] move secrets out of tracked config
- [x] document full rebuild and restore path

## Recommended Next Order

1. Finish doc drift cleanup.
2. Expose Git execution metadata in the dashboard.
3. Normalize runtime/workspace layout.
4. Harden secrets and recovery procedures.

## Superseded Notes

This file replaces the earlier phase checklist that assumed:

- subagent-first routing
- permanent test/review agents
- dashboard pages that were already complete but later proved unreliable

Those notes should not be used as the current operating reference.
