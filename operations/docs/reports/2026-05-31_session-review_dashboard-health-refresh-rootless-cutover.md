# Dashboard Health-Refresh Rootless Cutover

Date: 2026-05-31

## Lagebild

The dashboard is already running as a system service under the dedicated `rook-dashboard` account. One remaining root-managed dashboard-adjacent job, `rook-health-refresh`, was still running in the root user manager even though it only posts a local health refresh to `http://localhost:3001/api/control/health`.

The dashboard watchdog was reviewed in the same pass, but it still depends on a restart path and should stay in the user-manager boundary until there is a privileged control path for restarting the system service cleanly.

## Befunde

- `rook-health-refresh.service` and `rook-health-refresh.timer` were still enabled in the root user manager.
- The unit does not need root access; it only performs a localhost POST.
- This makes it a low-risk candidate for the same `rook-dashboard` system-service model used by the dashboard itself.
- The dashboard watchdog is not a safe cutover yet because it still uses `systemctl --user restart rook-dashboard.service`.

## Arbeitsplan

1. Add system service/timer copies for `rook-health-refresh`.
2. Install them into `/etc/systemd/system`.
3. Stop and remove the old user-timer binding.
4. Enable the new system timer.
5. Verify the service runs successfully under `rook-dashboard`.

## Umgesetzte Änderungen

- Added repo copies:
  - `operations/systemd/rook-health-refresh.service`
  - `operations/systemd/rook-health-refresh.timer`
- Installed live system units:
  - `/etc/systemd/system/rook-health-refresh.service`
  - `/etc/systemd/system/rook-health-refresh.timer`
- Disabled the old root user timer binding for `rook-health-refresh`.
- Enabled the system timer under PID 1.

## Validierung

- `systemctl status rook-health-refresh.timer rook-health-refresh.service` showed the system timer active and the service completing successfully.
- `systemctl show rook-health-refresh.service -p User -p Group -p FragmentPath -p MainPID -p ActiveState` confirmed:
  - `User=rook-dashboard`
  - `Group=rook-dashboard`
  - `FragmentPath=/etc/systemd/system/rook-health-refresh.service`
  - `ActiveState=inactive` after successful completion
- The live service executed successfully and returned `0`.

## Offene Risiken

- `rook-dashboard-watchdog` remains in the user manager because it still needs a restart-capable control path.
- OpenClaw gateway and node remain root-user-manager services for now because they are coupled to the existing user-level runtime control plane.

## Nächste Schritte

1. Decide whether to introduce a privileged restart helper for the dashboard watchdog, or keep it user-managed.
2. Continue reducing root-managed holdouts only where the control path is still clean and recoverable.
3. Tackle the OpenClaw gateway/node boundary only after the system-service dependency model is explicit.
