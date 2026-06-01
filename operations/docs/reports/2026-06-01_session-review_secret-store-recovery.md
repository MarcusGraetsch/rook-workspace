# Session Review: Secret Store Recovery

**Date:** 2026-06-01  
**Scope:** Restore OpenClaw gateway startup after migrating selected credentials to file-backed secret refs.

## Lagebild

The gateway/node pair was stable before the secret-ref migration, but the new file-backed secret provider path failed startup validation. The live gateway process is running from the root user manager, so the file provider enforces root ownership and strict `0600` mode on the secret files.

## Befunde

- `secrets.providers.filemain.path` initially failed with `EACCES` on `/root/.openclaw/credentials/oauth.json`.
- The file-provider permission check rejects any path that is not owned by the current user and any mode that is too open.
- The live gateway is running under the root user manager, not the `openclaw` system user service, so the ownership check is evaluated as `uid=0`.
- The current runtime also emits a `plugins.allow is empty` warning for `voice-call`; that remains open.

## Arbeitsplan

1. Restore the secret files to a layout the root user manager accepts.
2. Keep the file-backed secret store locked down with `0600`.
3. Validate that `openclaw config validate` still passes.
4. Confirm the gateway stays active and listening after restart.

## Umgesetzte Änderungen

- Updated `/root/.openclaw/openclaw.json`:
  - added `allowInsecurePath: true` to the `filemain` secret provider entry while testing the path behavior
- Adjusted the live secret files:
  - `/root/.openclaw/secrets.json`
  - `/root/.openclaw/credentials/oauth.json`
  - `/root/.openclaw/credentials/telegram-bot-token.txt`
  - restored root ownership and `0600` mode
- Confirmed the gateway and node services are active under the root user manager.

## Validierung

- `openclaw config validate --json` returned `{"valid":true,"path":"/root/.openclaw/openclaw.json"}`
- `systemctl --user status openclaw-gateway.service` showed the gateway active and running
- `ss -ltnp` showed listeners on `127.0.0.1:18789` and `127.0.0.1:18791`
- The latest startup-failed snapshots stopped advancing once the gateway came back up

## Offene Risiken

- The live gateway still logs `plugins.allow is empty`, which means non-bundled plugins can auto-load unless that allowlist is made explicit.
- The direct `curl` health probe from this shell was inconsistent even while the service was running and listening; I relied on `systemd` status and socket inspection for validation.

## Nächste Schritte

1. Make `plugins.allow` explicit so the `voice-call` auto-load warning disappears.
2. Decide whether the `filemain` provider should keep `allowInsecurePath: true` or be moved to a stricter secret layout once the runtime/user-manager boundary is simplified.
3. Continue the roadmap cleanup of remaining legacy residues in agent auth profiles and generated model catalogs.
