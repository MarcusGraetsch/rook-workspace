# Session Review: VM Ops and etcd Scheduler Migration

Date: 2026-05-31

Scope: Migration of the VM ops baseline chain and the kind/etcd backup from root cron into systemd timers.

## Lagebild

The host had already moved some critical jobs out of cron, but the daily VM ops report/threshold/notification chain and the kind/etcd snapshot were still scheduled from root crontab. The systemd timer pattern already existed on this VPS, so these jobs could be aligned with the current control plane.

## Befunde

- `vm-ops-baseline.sh`, `check-vm-ops-baseline-thresholds.mjs`, and `notify-vm-ops-threshold-failure.mjs` were still cron-backed.
- `backup-etcd-kind.sh` was still cron-backed and could collide with the Sunday runtime backup if left at 02:00.
- The VM ops baseline script already writes reports to `workspace/operations/docs/reports`, which is a good fit for systemd timer execution.

## Arbeitsplan

1. Add systemd service/timer pairs for the VM ops baseline, threshold, notify chain, and the kind/etcd backup.
2. Enable the timers.
3. Remove the matching cron entries.
4. Validate the timers, the crontab, and the generated baseline report.

## Umgesetzte Änderungen

- Added repo and installed units for:
  - `rook-vm-ops-baseline.service`
  - `rook-vm-ops-baseline.timer`
  - `rook-vm-ops-threshold.service`
  - `rook-vm-ops-threshold.timer`
  - `rook-vm-ops-notify.service`
  - `rook-vm-ops-notify.timer`
  - `rook-etcd-kind-backup.service`
  - `rook-etcd-kind-backup.timer`
- Enabled the new timers in the root user systemd instance.
- Removed the matching cron entries for:
  - `vm-ops-baseline.sh`
  - `check-vm-ops-baseline-thresholds.mjs`
  - `notify-vm-ops-threshold-failure.mjs`
  - `backup-etcd-kind.sh`
- Moved the etcd backup schedule from `02:00` to `02:10` to avoid overlap with the Sunday runtime backup.

## Validierung

- `systemd-analyze verify` passed for the new unit files; the only warnings were pre-existing ones from `hermes-gateway.service`.
- `systemctl --user enable --now` successfully activated all four new timers.
- `systemctl --user list-timers --all` now shows:
  - `rook-vm-ops-baseline.timer`
  - `rook-vm-ops-threshold.timer`
  - `rook-vm-ops-notify.timer`
  - `rook-etcd-kind-backup.timer`
- The timers executed immediately on activation:
  - `rook-vm-ops-baseline.service` completed successfully and wrote a fresh baseline report.
  - `rook-vm-ops-threshold.service` completed successfully.
  - `rook-vm-ops-notify.service` completed successfully.
  - `rook-etcd-kind-backup.service` completed successfully.
- `crontab -l` no longer contains the migrated jobs.

## Open Risks

- The remaining cron jobs still need migration or explicit retention justification.
- The VM ops notification path remains sensitive to threshold behavior; if thresholds change, notifications may need follow-up tuning.
- The kind/etcd backup is still tied to the current cluster endpoint and certificate path, so a kind topology change will require a follow-up review.

## Nächste Schritte

1. Decide whether the remaining cron jobs should stay cron-backed or move to timers next.
2. Review the freshly generated VM ops baseline report for any new host drift.
3. Keep narrowing the root crontab until only intentional exceptions remain.
4. Continue with OpenClaw task-state and dashboard simplification after the scheduler surface is stable.
