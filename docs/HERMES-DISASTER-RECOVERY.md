# Hermes Disaster Recovery

> Status: First baseline runbook
> Last updated: 2026-05-08
> Scope: Hermes/Phoenix runtime only

## Goal

Recover the Hermes/Phoenix system without assuming that OpenClaw recovery is sufficient.

Hermes has its own:

- runtime configuration
- auth material
- memory
- sessions
- SQLite state
- bridge integration

## Recovery Boundaries

Recover separately:

- Hermes runtime and local state
- bridge integration with Rook
- private memories and sessions

Do not assume these are recoverable from `rook-workspace` alone.

## Minimum Critical Artifacts

### Must preserve

- `/root/.hermes/config.yaml`
- `/root/.hermes/state.db`
- `/root/.hermes/kanban.db`
- `/root/.hermes/memories/`
- `/root/.hermes/logs/`
- `/root/.hermes/scripts/`
- `/root/.hermes/skills/`
- `/root/.hermes/channel_directory.json`
- `/root/.hermes/system-knowledge.md`
- `/root/rook-phoenix-comm/`
- `/root/sync-bridge/`

### Sensitive and restore-with-care

- `/root/.hermes/.env`
- `/root/.hermes/.discord_token`
- `/root/.hermes/auth.json`
- `/root/.hermes/google_client_secret.json`
- `/root/.hermes/google_oauth_pending.json`
- `/root/.hermes/processes.json`

These should be backed up under a restricted policy and never copied into general-purpose reports.

## Current Recovery Risks

1. Hermes state is large and locally concentrated in `state.db`.
2. Session history is extensive and privacy-sensitive.
3. Snapshots and migration backups may duplicate auth-bearing files.
4. No single, explicit Hermes restore procedure was previously documented in `rook-workspace`.

## Recommended Backup Sets

### Set A: Core runtime restore

- `config.yaml`
- `state.db`
- `kanban.db`
- `memories/`
- `skills/`
- `scripts/`
- `rook-phoenix-comm/`
- `sync-bridge/`

### Set B: Sensitive auth restore

- `.env`
- `.discord_token`
- `auth.json`
- `google_client_secret.json`
- other OAuth or bot auth material

This set should use tighter access controls than Set A.

### Set C: Optional forensic history

- `sessions/`
- `logs/`
- `state-snapshots/`
- `migration/`

Useful for diagnosis, but not strictly required for minimal service recovery.

## Restore Procedure

### 1. Restore repo and filesystem base

Re-clone or restore:

- `/root/.hermes`
- `/root/rook-phoenix-comm`
- `/root/sync-bridge`

### 2. Restore core runtime data

Restore at minimum:

- `config.yaml`
- `state.db`
- `kanban.db`
- `memories/`

### 3. Restore bridge dependencies

Verify:

- `rook-phoenix-comm/inbox`
- `rook-phoenix-comm/outbox`
- `rook-phoenix-comm/archive`
- Hermes bridge script path
- cron entry for the bridge

### 4. Restore auth material carefully

Restore only the auth files actually required to resume:

- bot connectivity
- provider access
- Google integrations

Re-authorize where safer than blindly restoring stale tokens.

### 5. Validate runtime

Check:

- Hermes process can start cleanly
- bridge cron runs without errors
- logs are writable
- state DB is readable
- no secret values appear in user-facing logs or exported reports

## Required Follow-Up Work

1. Use `operations/bin/backup-hermes-runtime.sh` as the baseline backup path.
2. Separate restricted auth backup from general runtime backup.
3. Add restore test cadence.
4. Add retention policy for session and snapshot folders.

## Baseline Backup Command

Core runtime only:

```bash
/root/.openclaw/workspace/operations/bin/backup-hermes-runtime.sh
```

Core runtime plus restricted auth set:

```bash
/root/.openclaw/workspace/operations/bin/backup-hermes-runtime.sh --include-sensitive-auth
```

## Baseline Restore Command

Core runtime and bridge state only:

```bash
/root/.openclaw/workspace/operations/bin/restore-hermes-runtime.sh \
  --from-local /root/backups/hermes-runtime/<timestamp>
```

Core runtime, bridge state, and restricted auth set:

```bash
/root/.openclaw/workspace/operations/bin/restore-hermes-runtime.sh \
  --from-local /root/backups/hermes-runtime/<timestamp> \
  --include-sensitive-auth
```

Dry-run the restore plan first:

```bash
/root/.openclaw/workspace/operations/bin/restore-hermes-runtime.sh \
  --from-local /root/backups/hermes-runtime/<timestamp> \
  --dry-run
```

## Snapshot Smoke Check

Validate that a backup snapshot has the expected baseline structure before restore:

```bash
/root/.openclaw/workspace/operations/bin/check-hermes-restore-snapshot.sh \
  /root/backups/hermes-runtime/<timestamp>
```

If the restricted auth archive is expected too:

```bash
/root/.openclaw/workspace/operations/bin/check-hermes-restore-snapshot.sh \
  /root/backups/hermes-runtime/<timestamp> \
  --require-sensitive-auth
```
