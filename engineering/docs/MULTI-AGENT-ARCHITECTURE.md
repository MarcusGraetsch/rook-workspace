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

1. User creates or edits work in Kanban.
2. Dashboard writes the local task DB for UI responsiveness.
3. Dashboard mirrors the task into canonical JSON.
4. If the task is repo-linked, dashboard syncs a GitHub Issue.
5. Done tasks may be archived.
6. Archived tasks remain restorable to backlog.

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

