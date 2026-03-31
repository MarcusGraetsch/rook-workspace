# System Overview

This document describes the system that is actually running on the VPS after the March 31, 2026 recovery work.

## Purpose

The Rook system is an OpenClaw-first coordinator-specialist environment with four operational layers:

1. Canonical task state in Git-backed JSON files
2. Dispatcher and worker execution through OpenClaw
3. Dashboard as the human control plane
4. Discord as command and notification transport

The system is not meant to be a free-form group chat. It is meant to move a bounded task from intake to execution, persist the result, and surface failure honestly.

## Source Of Truth

The source of truth is:

- `/root/.openclaw/workspace/operations/tasks/<project>/<task>.json`

Those files own:

- task identity
- current status
- assigned stage owner
- current claim
- failure state
- branch and commit references
- artifacts
- dashboard linkage
- GitHub issue linkage
- dispatcher metadata

The dashboard may cache and index task state, but it does not own it.

## Real Control Loop

The intended live control loop is:

1. Human creates or updates work in the dashboard or issues an instruction in Discord.
2. Dashboard mirrors durable task state into canonical task files.
3. `rook-dispatcher.timer` scans canonical tasks for dispatchable work.
4. Dispatcher claims the task and launches an isolated OpenClaw worker session through the local hook endpoint.
5. Worker operates in a bounded specialist workspace against the local checked-out repos.
6. Worker writes code, commits with `[agent:<id>][task:<id>] ...`, and updates the canonical task file.
7. Dashboard reflects the canonical task state and health snapshots.
8. If dispatch or worker execution fails, the dispatcher records the failure, clears the claim when appropriate, and emits an alert.

## Agent Roles

### Rook

- Owns orchestration and intake
- Should classify and route work
- Should not pretend a task is executing if no worker path exists

### Engineer

- Handles implementation, CI, infra, and fallback execution for testing/review stages when dedicated runtimes are unstable

### Researcher

- Handles source gathering and research-specific tasks

### Test

- Intended owner of testing-stage work
- Can currently fall back to `engineer` when runtime stability requires it

### Review

- Intended owner of review-stage work
- Can currently fall back to `engineer` when runtime stability requires it
- Bootstrap/setup work for the `review` stage should still be executed by `engineer` until the specialist path is proven stable

## Dashboard Role

The dashboard is the human control plane.

It should be used for:

- viewing work
- editing task state
- checking health
- understanding blocked conditions

It should not be treated as the only task store. If the dashboard goes offline, canonical task files must still describe recoverable system state.

## Discord Role

Discord is a command and notification surface.

It should be used for:

- human instructions
- progress updates
- failure notifications
- escalation

It should not be the only place where task state exists.

## Health Model

The system now uses stronger health signals than heartbeat files alone.

Operational signals include:

- user `systemd` service state
- dashboard watchdog checks
- canonical task `claimed_by`, `last_heartbeat`, and `failure_reason`
- runtime smoke snapshots under `operations/health/runtime-smoke.json`
- dispatcher alert records under `operations/health/dispatcher-alerts.json`
- worker transcript inspection for abort events

Heartbeat files by themselves are not sufficient evidence that work is executing.

## Supervised Services

The minimum supervised runtime is:

- `openclaw-gateway.service`
- `rook-dashboard.service`
- `rook-dashboard-watchdog.timer`
- `rook-dispatcher.timer`

If the gateway is up but the dashboard and dispatcher are not supervised, the system degrades into chat without reliable execution.

## Failure Semantics

The system should prefer explicit failure over fake progress.

Examples:

- If the dashboard is down, supervision/watchdog should recover it and logs should show the failure.
- If a worker launch fails, the canonical task should become `blocked` with a real failure reason.
- If a hook worker aborts mid-task, the dispatcher should detect the abort from the transcript and block the task instead of leaving a stale claim.
- If Discord notification fails, the alert must still be written locally.

## Persistence And Recovery

Durable recovery depends on:

- canonical task files in Git
- actual repo branches and commits
- user `systemd` unit files
- runbooks and contract checks

The system should be recoverable from:

1. clone repos
2. restore OpenClaw config and env files
3. install/sync the user `systemd` units
4. run the contract check
5. run runtime smoke checks

## Current Weak Spots

The remaining weak spots are narrower than before:

- long-running worker stability is still provider/runtime-sensitive
- official OpenClaw updates can still rewrite live model or timeout defaults if they are not re-checked
- runtime and docs can drift after official OpenClaw updates unless checked explicitly

That means the system is no longer imaginary, but it is not yet “fire and forget.”
