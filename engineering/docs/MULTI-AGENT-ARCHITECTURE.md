# Multi-Agent Architecture

> Status: Active reference
> Last updated: 2026-03-30

This document replaces the older subagent-first architecture notes.

For the broader workspace-level reference, see:

- [SYSTEM-MAP.md](/root/.openclaw/workspace/docs/SYSTEM-MAP.md)
- [TARGET-ARCHITECTURE.md](/root/.openclaw/workspace/docs/TARGET-ARCHITECTURE.md)
- [ROADMAP.md](/root/.openclaw/workspace/docs/ROADMAP.md)

## Engineering Summary

The Rook system now uses a hybrid control model:

- `rook-dashboard` Kanban is the primary human task interface
- canonical task files in `workspace/operations/tasks/` are the durable internal record
- GitHub Issues mirror repo-linked work
- structured health snapshots in `workspace/operations/health/` replace prompt-based heartbeat logic

## Current Agent Model

Permanent agents:

- `rook`
- `engineer`
- `researcher`
- `consultant`
- `coach`
- `health`

Temporary workflow roles:

- review
- test
- devops
- planner

Deprecated model:

- Discord-spawned fake peer agents
- engineer-owned subagent sessions for non-engineer work
- natural-language cron heartbeats as the health mechanism

## Task Flow

1. User creates rough work in Kanban, usually in `Backlog` or `Intake`.
2. `Intake` is the pre-delivery structuring phase. A human can write plain language and the dashboard refines it into a better task contract.
3. Dashboard writes the local task DB for UI responsiveness.
4. Dashboard mirrors the task into canonical JSON.
5. If the task is repo-linked, dashboard syncs a GitHub Issue.
6. Only structured tickets should move to `Ready`.
7. Done tasks may be archived.
8. Archived tasks remain restorable to backlog.

## Workflow Stages

- `Backlog`: loose ideas or parked work
- `Intake`: refinement and task shaping before dispatch
- `Ready`: dispatchable work only
- `In Progress`: specialist execution
- `Testing`: explicit validation stage
- `Review`: explicit review stage
- `Blocked`: honest stop with a reason
- `Done`: durable completion

## Intake Rules

- `Ready` is gated.
- A task must not move to `Ready` unless it has:
  - a non-empty intake brief
  - at least one checklist item
- Tickets in `Intake` should default to `coach` ownership unless a different specialist is intentionally chosen.
- The refinement step should leave durable intake metadata in the canonical task file:
  - original brief
  - refinement source
  - refinement summary
  - refined timestamp
- Refinement should not assume every ticket is software implementation work. Intake should shape the ticket according to likely work type:
  - engineering: scope, implementation target, validation
  - research: question, evidence, findings
  - consulting: decision framing, options, recommendation
- The dashboard API now enforces this gate, so drag-and-drop or modal edits that try to bypass intake should fail.

## Git Flow

Branch naming:

- `agent/<agent_id>/<task_id>-<slug>`

Commit naming:

- `[agent:<agent_id>][task:<task_id>] summary`

## Health Flow

Current health source of truth:

- `workspace/operations/health/*.json`

Health snapshots are derived from:

- active assigned tasks
- local runtime/session state
- repo/workspace state where available

## Dashboard Role

The engineering dashboard should provide:

- Kanban task management
- archive and restore history
- GitHub sync status
- agent health visibility
- branch/commit/PR visibility

The dashboard should not become the only persistent store.

## Discord Role

Discord is now treated as:

- intake
- notification
- discussion

Discord is not:

- the source of truth for tasks
- a reliable independent agent runtime layer

## Notes

The older architecture assumptions about automatic test/review agents and Discord-owned subagent sessions are no longer the current target. They remain useful as historical context only.
