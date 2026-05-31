# Session Review: Dashboard Rootless Cutover

Date: 2026-05-31

Scope: Move the Rook dashboard off the root user manager onto a dedicated `rook-dashboard` system account with narrow filesystem access.

## Lagebild

The scheduler cleanup was complete and the remaining root-run problem was the dashboard itself. It had the narrowest file footprint among the long-lived services, making it the safest first migration candidate for a real service-user cutover.

## Befunde

- The dashboard depends on the repo tree at `/root/.openclaw/workspace/engineering/rook-dashboard`.
- The startup scripts also need access to `/root/.openclaw/workspace/operations/bin/start-dashboard.sh`, `/root/.openclaw/workspace/operations/bin/dashboard-startup-guard.sh`, and the runtime backup tree.
- The workspace still lives under `/root`, so the cutover required ACL traversal exceptions on the path chain.
- `dashboard-startup-guard.sh` needed a small scope-aware fix so it would not try to stop a user-managed unit from inside a system service context.

## Arbeitsplan

1. Install ACL tooling.
2. Create a dedicated `rook-dashboard` system account.
3. Grant only the dashboard’s required path access.
4. Add a system-level `rook-dashboard.service`.
5. Stop and disable the old root user service.
6. Start the new system service and validate that it binds to `127.0.0.1:3001`.

## Umgesetzte Änderungen

- Added the dedicated system account `rook-dashboard`.
- Granted narrow ACL access to:
  - `/root`
  - `/root/.openclaw`
  - `/root/.openclaw/workspace`
  - `/root/.openclaw/workspace/engineering`
  - `/root/.openclaw/workspace/operations`
  - `/root/.openclaw/workspace/operations/bin`
  - `/root/.openclaw/workspace/engineering/rook-dashboard`
  - `/root/backups/rook-runtime`
- Updated:
  - `/root/.openclaw/workspace/operations/bin/start-dashboard.sh`
  - `/root/.openclaw/workspace/operations/bin/dashboard-startup-guard.sh`
  - `/root/.openclaw/workspace/operations/systemd/rook-dashboard.service`
- Installed the system service at `/etc/systemd/system/rook-dashboard.service`.
- Stopped and disabled the old user service.
- Started the new system service.

## Validierung

- `systemctl show rook-dashboard.service` reports `User=rook-dashboard` and `Group=rook-dashboard`.
- `ps` shows the live dashboard process tree is owned by `rook-dashboard`.
- `ss -ltnp` shows `127.0.0.1:3001` is still listening.
- The dashboard journal shows the DB integrity guard passed and Next.js started normally.
- `id rook-dashboard` confirms the dedicated account exists.
- `getfacl` on the relevant directories confirms only narrow ACL access was granted.

## Open Risks

- The workspace still lives under `/root`, so more services will need a similar ACL or path redesign before they can move off root cleanly.
- The dashboard is now rootless, but the backup and restore paths it reads are still tied to the current `/root` layout.

## Nächste Schritte

1. Use this ACL + system-service pattern for one more low-risk daemon if its file footprint is similarly narrow.
2. Design a longer-term path for moving more services out of `/root` without turning ACLs into a maintenance tax.
3. Keep the focus on explicit ownership boundaries rather than blanket privilege reduction.
