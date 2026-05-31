# Dashboard Watchdog System Cutover

Date: 2026-05-31

## Lagebild

The dashboard itself is already a system service under the dedicated `rook-dashboard` account. The remaining dashboard watchdog was still in the root user manager and was the last dashboard-adjacent unit that needed an explicit restart-capable control path.

The watchdog cannot stay rootless as-is because it must be able to restart `rook-dashboard.service`. A direct restart attempt from the `rook-dashboard` account failed with interactive authentication required, so the cutover needed to preserve restart authority.

## Befunde

- `rook-dashboard-watchdog.service` was still configured as a user unit.
- The script hardcoded `systemctl --user restart`, which is incompatible with a system-service cutover.
- The least risky fix was to make the watchdog a system service and route restart actions through the system manager explicitly.

## Arbeitsplan

1. Make `dashboard-watchdog.sh` scope-aware.
2. Install a system copy of `rook-dashboard-watchdog.service` and `rook-dashboard-watchdog.timer`.
3. Enable the timer in PID 1 and disable the old user-timer binding.
4. Validate that the watchdog exits successfully under the system manager.

## Umgesetzte Änderungen

- Updated `operations/bin/dashboard-watchdog.sh` to respect `ROOK_DASHBOARD_SYSTEMD_SCOPE` and call either `systemctl restart` or `systemctl --user restart` accordingly.
- Updated `operations/systemd/rook-dashboard-watchdog.service` to run as `root` and set `ROOK_DASHBOARD_SYSTEMD_SCOPE=system`.
- Installed live units:
  - `/etc/systemd/system/rook-dashboard-watchdog.service`
  - `/etc/systemd/system/rook-dashboard-watchdog.timer`
- Disabled the old user-timer binding and enabled the system timer.

## Validierung

- A direct restart test as `rook-dashboard` failed with `Interactive authentication required`, confirming the watchdog needed system-manager authority.
- `systemctl status rook-dashboard-watchdog.service rook-dashboard-watchdog.timer` showed the new system watchdog ran successfully and exited `0`.
- `systemctl show rook-dashboard-watchdog.service -p User -p Group -p FragmentPath -p MainPID -p ActiveState` confirmed:
  - `User=root`
  - `Group=root`
  - `FragmentPath=/etc/systemd/system/rook-dashboard-watchdog.service`
  - `ActiveState=inactive` after successful completion

## Offene Risiken

- The watchdog is now explicitly root-run again, but that is constrained to a localhost health check plus service restart authority.
- The OpenClaw gateway and node remain in the root user manager and still need a separate boundary decision.

## Nächste Schritte

1. Tackle the OpenClaw gateway/node boundary next, since that is the remaining large root-managed runtime block.
2. Decide whether there is a safe way to make gateway/node rootless without breaking state access and update flow.
3. Keep the dashboard path stable while the next cutover is designed.
