# Session Review: Phase 2 Hardening Pass

Date: 2026-05-31

Scope: Live VPS hardening work for Hermes + OpenClaw, focused on cron overlap protection, ingress classification, SSH hardening, and fail2ban setup.

## Lagebild

The VPS had already been tightened in Phase 1 by moving `ki-werkstatt` internal ports and the Rook dashboard to localhost-only binds. This pass addressed the next Blueprint items that could be applied safely without changing the larger architecture.

## Befunde

- Root cron still ran multiple overlapping or long-lived jobs directly.
- The live ingress map was already partially tunnel-only, but there was no written policy that classified public, tunnel-only, localhost-only, and container-only services.
- SSH still allowed root login and had X11 forwarding enabled.
- `fail2ban` was not installed before this session.

## Arbeitsplan

1. Add lock protection to the long-running backup and health scripts.
2. Document the ingress policy in the workspace.
3. Install and enable `fail2ban` with an SSH jail for port `6262`.
4. Apply a conservative SSH hardening change that does not risk lockout.
5. Validate everything with syntax checks and service status.

## Umgesetzte Änderungen

- Added lock guards to:
  - `/root/.openclaw/workspace/operations/bin/backup-runtime-to-drive.sh`
  - `/root/.openclaw/workspace/operations/bin/backup-hermes-derived-data.sh`
  - `/root/.openclaw/workspace/operations/bin/backup-etcd-kind.sh`
  - `/root/.openclaw/health/health-guardian.sh`
  - `/root/.openclaw/workspace/operations/bin/sync-github-issues.mjs`
- Added ingress policy documentation:
  - `/root/.openclaw/workspace/operations/docs/ingress-policy.md`
- Installed and enabled `fail2ban`.
- Added `/etc/fail2ban/jail.d/sshd.local` for SSH on port `6262`.
- Added `/etc/ssh/sshd_config.d/99-openclaw-hardening.conf` with `X11Forwarding no`.
- Reloaded SSH so the X11 hardening took effect immediately.

## Validierung

- `bash -n` passed on all modified shell scripts.
- `node --check` passed on `sync-github-issues.mjs`.
- `fail2ban-client status` shows one jail: `sshd`.
- `fail2ban-client status sshd` shows the jail is active and monitoring `/var/log/auth.log`.
- `sshd -T | rg 'x11forwarding'` now reports `x11forwarding no`.
- `systemctl status fail2ban` shows the service is active and running.

## Open Risks

- Root SSH login is still enabled; it was not changed in this pass because that needs a verified named sudo admin path first.
- The ingress policy is documented, but any future service can still drift unless it is periodically checked against live sockets and tunnel config.
- The kind/Kubernetes backup still exists; the larger decision on whether kind should remain always-on is unresolved.

## Nächste Schritte

1. Convert the remaining root cron jobs to systemd timers one by one.
2. Add explicit backup restore drills for OpenClaw, Hermes, GitLab, and the kind snapshot path.
3. Decide whether root SSH login should be removed after a named sudo user is verified.
4. Move on to the OpenClaw task-state simplification and dashboard projection cleanup.
