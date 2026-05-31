# Rootless Runtime Validation

Date: 2026-05-31

## Lagebild

The main OpenClaw runtime cutover is complete:

- `openclaw-gateway.service` runs as the dedicated `openclaw` system user
- `openclaw-node.service` runs as the dedicated `openclaw` system user
- the dashboard already runs as `rook-dashboard`
- the dashboard watchdog and health-refresh jobs are in the system manager where their restart paths are explicit

The runtime still uses the existing `/root/.openclaw` state tree, but the service account now has the ACL access it needs to operate that tree safely.

## Befunde

- The gateway health endpoint is live at `http://127.0.0.1:18789/health`.
- Recent log noise has stopped after the ACL expansion.
- `openclaw doctor --deep` reports configuration drift, but not a service outage.
- The remaining warnings are configuration-level, not cutover blockers:
  - legacy `channels.*.threadBindings.spawnSubagentSessions/spawnAcpSessions` keys
  - dispatcher and rook agents missing the `message` tool for some Discord/Telegram actions
  - legacy `openai-codex/*` model refs that should move to `openai/*`
  - Telegram still in first-time setup mode with allowlist behavior

## Arbeitsplan

1. Verify the rootless gateway/node pair after the final ACL fixes.
2. Run bounded `openclaw` health checks.
3. Separate runtime problems from config drift.
4. Record the remaining configuration work as the next follow-up.

## Umgesetzte Änderungen

No new code or service files were changed in this validation pass.

## Validierung

- `systemctl status` confirms both gateway and node are active under `User=openclaw`.
- `curl -fsS http://127.0.0.1:18789/health` returns `{"ok":true,"status":"live"}`.
- Fresh `journalctl` output after the ACL updates shows no new permission errors.
- `openclaw doctor --deep` completed with warnings only.

## Offene Risiken

- `openclaw doctor --deep` still reports config drift that should be cleaned up deliberately, not with a blind bulk rewrite.
- The Telegram and dispatcher messaging warnings should be reviewed before any automatic config migration.
- The current OAuth placeholder file should be treated as a temporary compatibility shim until the real credential source is confirmed.

## Nächste Schritte

1. Review the doctor warnings one by one, starting with the legacy channel thread-binding keys.
2. Decide whether to apply `openclaw doctor --fix` wholesale or to rewrite only the safe config fragments manually.
3. Audit the message-tool allowlists for `rook` and `dispatcher` before changing any channel routing behavior.
