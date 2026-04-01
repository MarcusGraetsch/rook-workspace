# Backup and Recovery

This directory contains scripts for disaster recovery.

## Files

- **backup.sh** - Creates backups of workspace and configs
- **restore.sh** - Restores environment on fresh VPS
- **../operations/bin/backup-runtime-to-drive.sh** - Snapshots live runtime state and syncs it to Google Drive via `rclone`
- **../operations/bin/restore-runtime-backup.sh** - Restores a runtime backup snapshot from local disk or Google Drive
- **SECRETS.md** - Documents API keys and sensitive config

## Usage

### Creating Backups

```bash
# Runtime-state backup for the live system
/root/.openclaw/workspace/operations/bin/backup-runtime-to-drive.sh

# Backups stored in: /root/backups/rook-runtime/
```

The runtime backup is the preferred path for the current VPS because it protects the important local operational state without trying to commit or tar the entire dirty workspace.

### Restoring Runtime State

```bash
# Restore from local snapshot
/root/.openclaw/workspace/operations/bin/restore-runtime-backup.sh \
  --from-local /root/backups/rook-runtime/<timestamp>

# Restore directly from Google Drive
/root/.openclaw/workspace/operations/bin/restore-runtime-backup.sh \
  --from-gdrive <host>/<timestamp>
```

### Restoring After VPS Failure

```bash
# On fresh VPS
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/digital-capitalism-research/master/scripts/restore.sh
chmod +x restore.sh
sudo ./restore.sh
```

Or manually:

```bash
# 1. Install dependencies
apt-get update && apt-get install -y git nodejs npm python3 ffmpeg

# 2. Install OpenClaw
npm install -g openclaw

# 3. Clone repository
git clone https://github.com/YOUR_USERNAME/digital-capitalism-research.git /root/.openclaw/workspace

# 4. Restore API keys (see SECRETS.md)
```

## What's Backed Up

- Dashboard SQLite state
- Canonical tasks and archived tasks
- Project registry
- Health snapshots
- Dispatcher logs
- Git head/status manifests for the main workspace and dashboard repo

## What's NOT Backed Up (Must Restore Manually)

- API keys (see SECRETS.md)
- GitHub SSH keys (if using SSH auth)
- System-level configurations

## Cloud Storage Integration (Optional)

For off-server backup storage, see CLOUD_STORAGE.md for setup instructions.

For the current runtime flow, configure `rclone` with a `gdrive:` remote and use the runtime backup script above. The expected target is:

```text
gdrive:DigitalCapitalismBackups/rook-runtime/<host>/
```
