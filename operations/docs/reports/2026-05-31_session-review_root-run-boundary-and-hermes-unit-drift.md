# Session Review: Root-Run Boundary and Hermes Unit Drift

Date: 2026-05-31

Scope: Assess the next step after scheduler migration, and clean up a live Hermes systemd drift warning.

## Lagebild

The recurring job scheduler is now fully on systemd timers and the root crontab is empty. The next blueprint priority is root-run service reduction, but the active services still depend on paths under `/root`, which makes a direct service-user migration non-trivial.

## Befunde

- Dedicated non-root service users do not yet exist for the main runtime components.
- The core workspace layout still lives under `/root/.openclaw`, so non-root services would need filesystem access redesign before a clean migration.
- `hermes-gateway.service` was logging unsupported restart keys on every systemd verify/status pass.

## Arbeitsplan

1. Remove the unsupported Hermes restart directives.
2. Reload the user systemd daemon.
3. Re-check the Hermes unit and keep the current runtime running.
4. Record the architectural blocker for service-user migration instead of guessing a partial fix.

## Umgesetzte Änderungen

- Updated `/root/.config/systemd/user/hermes-gateway.service` to remove:
  - `RestartMaxDelaySec=300`
  - `RestartSteps=5`
- Reloaded the user systemd daemon.

## Validierung

- `systemd-analyze verify /root/.config/systemd/user/hermes-gateway.service` no longer reports the unsupported Hermes restart directives.
- `systemctl --user status hermes-gateway.service` still shows the gateway active and running.
- The remaining `systemd-analyze verify` warning is pre-existing and unrelated: `/lib/systemd/system/snapd.service` uses `RestartMode`, which this host’s systemd still ignores.

## Open Risks

- Root-run service reduction is still blocked by the `/root`-based workspace layout.
- Any real service-user migration will need a permissions and path strategy, not just a unit-file change.

## Nächste Schritte

1. Design the access model for moving long-lived services off root while the workspace stays under `/root`.
2. Prefer the least invasive service-user migration only after the path model is explicit.
3. Keep focusing on observability and explicit ownership boundaries rather than ad hoc privilege changes.
