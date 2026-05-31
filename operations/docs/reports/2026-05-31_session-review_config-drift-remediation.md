# Config Drift Remediation

Date: 2026-05-31

## Lagebild

After the rootless runtime cutover, the next leverage point was configuration drift in the OpenClaw config and runtime state. The first two concrete issues were:

- a legacy Discord thread-binding key in `openclaw.json`
- a stale `openai-codex/gpt-5.4` model reference in the same file

The gateway and node remained live while these changes were made.

## Befunde

- `channels.discord.threadBindings.spawnSubagentSessions` was still using the legacy key shape.
- `agents.defaults.models.openai-codex/gpt-5.4` still pointed at the deprecated namespace.
- The rootless runtime then exposed a deeper permission gap:
  - `/root/.openclaw/identity` was ACL-masked too tightly for the service account
  - `/root/.openclaw/agents/rook/agent` needed ownership, not just ACLs, because the runtime tries to `chmod` it

## Arbeitsplan

1. Rewrite the legacy thread-binding key to the current shape.
2. Rewrite the stale model namespace to `openai/gpt-5.4`.
3. Restart the gateway and node so the new config loads.
4. Fix any permission errors surfaced by the restart logs.
5. Re-run deep doctor checks and confirm the targeted warnings are gone.

## Umgesetzte Änderungen

- Updated `/root/.openclaw/openclaw.json`:
  - `channels.discord.threadBindings.spawnSubagentSessions` → `spawnSessions`
  - `agents.defaults.models.openai-codex/gpt-5.4` → `openai/gpt-5.4`
- Fixed ACL mask and access on:
  - `/root/.openclaw/identity`
  - `/root/.openclaw/identity/device.json`
  - `/root/.openclaw/identity/device-auth.json`
- Changed ownership of:
  - `/root/.openclaw/agents/rook/agent`

## Validierung

- Restarted `openclaw-gateway.service` and `openclaw-node.service`.
- `curl -fsS http://127.0.0.1:18789/health` returned `{"ok":true,"status":"live"}`.
- Fresh journal output after the fixes showed no new `EACCES`/`EPERM` errors for the identity or agent paths.
- `openclaw doctor --deep` no longer matched the legacy thread-binding warning or the stale `openai-codex/gpt-5.4` warning.

## Offene Risiken

- `tasks/registry` still logs a restore failure during startup, but the service remains healthy.
- `plugins.allow` still warns that non-bundled plugin discovery is permissive.
- `doctor` still reports higher-level config warnings outside this pass:
  - dispatcher/rook message-tool allowlist gaps
  - Telegram first-time setup / allowlist mode

## Nächste Schritte

1. Decide whether to fix the message-tool allowlists next or leave them until a dedicated communication-policy pass.
2. Review whether the remaining `tasks/registry` restore warning needs a targeted fix.
3. Decide whether the Telegram first-time setup warning is intentional or still needs policy cleanup.
