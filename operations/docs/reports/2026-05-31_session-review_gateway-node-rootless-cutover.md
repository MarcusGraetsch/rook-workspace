# OpenClaw Gateway and Node Rootless Cutover

Date: 2026-05-31

## Lagebild

The OpenClaw gateway and node host were the last large root-user-manager runtime block in the platform. They were still running as root-managed user services and depended on the shared `/root/.openclaw` state tree.

The simplest safe architecture was not to split state into a new tree. Instead, a dedicated `openclaw` system account was created and granted narrow ACL access to the existing OpenClaw state directories, config, credentials, logs, and telegram/device subtrees.

## Befunde

- `openclaw-gateway.service` and `openclaw-node.service` were still in the root user manager.
- The gateway uses the shared state tree under `/root/.openclaw` and needed access to config, logs, credentials, and runtime state.
- The node host wrote safe-replace temp files under the state root and also touched telegram and device-pairing subtrees.
- The gateway required an `oauth.json` file under `/root/.openclaw/credentials`; the file was not present, so a minimal placeholder was created to satisfy the startup path.
- `openclaw-gateway-autoreload.path/.service` also depended on the gateway restart path and needed to move with it.

## Arbeitsplan

1. Create a dedicated `openclaw` system account.
2. Grant ACL access to the existing `/root/.openclaw` state tree.
3. Add system-service copies of gateway, node, and gateway autoreload units.
4. Stop the user-manager services and start the system-manager services.
5. Fix the specific ACL gaps reported by gateway/node logs.
6. Validate the gateway health endpoint.

## Umgesetzte Änderungen

- Created the `openclaw` system account.
- Granted ACLs for `openclaw` on:
  - `/root`
  - `/root/.openclaw`
  - the top-level OpenClaw state directories under `/root/.openclaw`
  - `/root/.openclaw/credentials`
  - `/root/.openclaw/logs`
  - `/root/.openclaw/telegram`
  - `/root/.openclaw/devices`
  - the relevant state files, including `openclaw.json`
- Added repo copies:
  - `operations/systemd/openclaw-node.service`
  - `operations/systemd/openclaw-gateway-autoreload.service`
  - `operations/systemd/openclaw-gateway-autoreload.path`
- Updated `operations/systemd/openclaw-gateway.service` to run as `openclaw` and point at the existing `/root/.openclaw` state tree.
- Installed live system units under `/etc/systemd/system/` for gateway, node, and gateway autoreload.
- Stopped the old user-manager gateway/node services and disabled the corresponding user units.
- Created `/root/.openclaw/credentials/oauth.json` as a minimal placeholder so the gateway startup path could complete.

## Validierung

- `systemctl show` confirmed both services are running as:
  - `User=openclaw`
  - `Group=openclaw`
  - live fragments at `/etc/systemd/system/openclaw-gateway.service` and `/etc/systemd/system/openclaw-node.service`
- `curl -fsS http://127.0.0.1:18789/health` returns `{"ok":true,"status":"live"}`.
- `journalctl` after the final restart shows the node and gateway active without new permission errors.
- The earlier ACL issues were reproduced and then resolved in sequence:
  - safe-replace temp file write failure at the state root
  - missing access to `credentials/oauth.json`
  - missing access to `telegram/ingress-spool-default`
  - missing access to `devices/pending.json`

## Offene Risiken

- The `oauth.json` file is currently a minimal placeholder, not a validated OAuth payload.
- The ACL footprint is intentionally broad inside `/root/.openclaw` because the runtime still uses a single shared state tree.
- `plugins.allow` still reports a warning about non-bundled plugin discovery; that is a separate policy decision, not a startup failure.

## Nächste Schritte

1. Validate whether the placeholder `oauth.json` is sufficient for all gateway features or needs real credential content.
2. Audit whether the current ACL breadth inside `/root/.openclaw` can be narrowed further without breaking runtime behavior.
3. Move on to state simplification and source-of-truth cleanup now that the major root-run boundary is reduced.
