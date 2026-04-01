# Disaster Recovery

> Status: Working runbook
> Last updated: 2026-04-01

## Goal

Rebuild the system from repos and environment configuration with minimal local-only loss.

## Current Recovery Coverage

Recoverable now:

- workspace repos
- canonical task files
- archived task history
- health snapshot model
- dashboard code and sync logic
- runtime backup sets under `/root/backups/rook-runtime/` when the backup timer has run

Not yet fully recoverable:

- all runtime message/session state
- all local config/secrets without separate backup
- OAuth-backed cloud credentials unless `rclone` config is restored or re-authorized

## Runtime Backup Coverage

The runtime backup job is designed to protect the main local-only operational state:

- `engineering/rook-dashboard/data/kanban.db`
- `operations/tasks/`
- `operations/archive/tasks/`
- `operations/projects/projects.json`
- `operations/health/`
- `operations/logs/dispatcher/`

Backups are written locally to:

```text
/root/backups/rook-runtime/<timestamp>/
```

If `rclone` is configured with `gdrive:`, the same snapshot is copied to:

```text
gdrive:DigitalCapitalismBackups/rook-runtime/<host>/<timestamp>/
```

## Recovery Procedure

### 1. Clone Core Repos

```bash
git clone git@github.com:MarcusGraetsch/rook-agent.git ~/.openclaw/rook-agent
git clone --recursive git@github.com:MarcusGraetsch/rook-workspace.git ~/.openclaw/workspace
```

### 2. Restore Environment and Secrets

Restore:

- OpenClaw config
- `rclone` config if you want direct Google Drive restore access
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

### 7. Restore Runtime Backup Snapshot

If a recent runtime backup exists, restore the local operational state before rebuilding by hand.

Example:

```bash
# Preferred restore path
/root/.openclaw/workspace/operations/bin/restore-runtime-backup.sh \
  --from-gdrive <host>/<timestamp>

# Or restore from a local snapshot
/root/.openclaw/workspace/operations/bin/restore-runtime-backup.sh \
  --from-local /root/backups/rook-runtime/<timestamp>
```

Restore while the dashboard and dispatcher are stopped, then restart them and verify `/kanban`.

## Recovery Priorities

1. recover canonical tasks
2. recover GitHub linkage
3. recover dashboard visibility
4. recover optional transient messaging/runtime state
5. restore OAuth/cloud access only after the core local state is back

## Follow-Up Improvements Needed

- move secrets fully out of tracked config
- document exact backup locations for auth material
- reduce remaining local-only runtime state
