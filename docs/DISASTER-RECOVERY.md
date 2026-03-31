# Disaster Recovery

> Status: Working runbook
> Last updated: 2026-03-30

## Goal

Rebuild the system from repos and environment configuration with minimal local-only loss.

## Current Recovery Coverage

Recoverable now:

- workspace repos
- canonical task files
- archived task history
- health snapshot model
- dashboard code and sync logic

Not yet fully recoverable:

- all runtime message/session state
- all local config/secrets without separate backup

## Recovery Procedure

### 1. Clone Core Repos

```bash
git clone git@github.com:MarcusGraetsch/rook-agent.git ~/.openclaw/rook-agent
git clone --recursive git@github.com:MarcusGraetsch/rook-workspace.git ~/.openclaw/workspace
```

### 2. Restore Environment and Secrets

Restore:

- OpenClaw config
- auth tokens
- GitHub CLI auth if required
- any `.env.d` or equivalent local secret files

Do not rely on tracked config files as the only secret source.

### 3. Start OpenClaw Runtime

```bash
cd ~/.openclaw
openclaw gateway start
```

### 4. Start Dashboard

```bash
cd ~/.openclaw/workspace/engineering/rook-dashboard
npm install
npm run dev -- --hostname 0.0.0.0 --port 3001
```

If `.next` is corrupted:

```bash
rm -rf .next
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Only remove `.next` while the dev server is stopped.

### 5. Verify Core Services

Check:

- OpenClaw gateway is running
- dashboard is reachable
- `/kanban` loads
- `/agents` loads
- `/github` diagnostics show expected repo access

### 6. Rebuild Projection State

The dashboard can rebuild active task state from canonical task files because:

- tasks live in `workspace/operations/tasks/`
- archived tasks live in `workspace/operations/archive/tasks/`

If needed, re-run task sync/reprojection logic from the dashboard APIs rather than manually reconstructing SQLite rows.

## Recovery Priorities

1. recover canonical tasks
2. recover GitHub linkage
3. recover dashboard visibility
4. recover optional transient messaging/runtime state

## Follow-Up Improvements Needed

- move secrets fully out of tracked config
- document exact backup locations for auth material
- reduce remaining local-only runtime state

