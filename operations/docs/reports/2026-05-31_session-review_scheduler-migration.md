# Session Review: Scheduler Migration

Date: 2026-05-31

Scope: Conversion of selected root cron jobs into systemd timers and removal of the matching cron entries.

## Lagebild

The VPS had already been hardened at the network layer and had basic cron overlap locks in place. The remaining issue was that several important recurring jobs were still only visible as root cron entries.

## Befunde

- `sync-github-issues.mjs`, `health-guardian.sh`, and `backup-hermes-derived-data.sh` were still scheduled from root crontab.
- The host already had a good systemd timer pattern for backup and dispatcher jobs, so these jobs could be moved into the same control plane.
- `openclaw-gateway-health.timer` existed but its service unit was missing from the user systemd directory.

## Arbeitsplan

1. Add systemd service/timer pairs for the selected cron jobs.
2. Enable the new timers.
3. Remove the matching cron lines.
4. Validate the timer states and the live results.

## Umgesetzte Änderungen

- Added repo copies and installed user units for:
  - `openclaw-gateway-health.service`
  - `openclaw-gateway-health.timer`
  - `rook-github-issues-sync.service`
  - `rook-github-issues-sync.timer`
  - `hermes-derived-backup.service`
  - `hermes-derived-backup.timer`
- Activated the new timers with `systemctl --user enable --now`.
- Removed the matching cron entries for:
  - `sync-github-issues.mjs`
  - `health-guardian.sh`
  - `backup-hermes-derived-data.sh`
- Kept the remaining cron jobs untouched.

## Validierung

- `systemd-analyze verify` passed for the new unit files; the only warnings were pre-existing ones from `hermes-gateway.service`, not from the new units.
- `systemctl --user list-timers --all` shows the new timers active and scheduled:
  - `openclaw-gateway-health.timer`
  - `rook-github-issues-sync.timer`
  - `hermes-derived-backup.timer`
- `systemctl --user status openclaw-gateway-health.service` shows a successful run.
- `systemctl --user status rook-github-issues-sync.service` shows a successful run and reports 9 GitHub issues closed by the sync.
- `systemctl --user status hermes-derived-backup.service` shows the backup is still in progress, with the local archive and Google Drive sync phase active at the time of observation.
- `crontab -l` no longer contains the migrated cron entries.

## Open Risks

- The Hermes derived-data backup was still running during the last check, so final completion was not yet observed in this session.
- Root cron still contains other jobs that should be migrated later, especially the remaining backup and baseline-related jobs.

## Nächste Schritte

1. Finish observing the Hermes derived-data backup until the systemd unit exits cleanly.
2. Migrate the remaining root cron jobs one by one.
3. Decide whether `backup-etcd-kind.sh` should move to a timer next or remain cron-backed until kind usage is clarified.
4. Continue with the OpenClaw task-state and dashboard projection simplification work.
