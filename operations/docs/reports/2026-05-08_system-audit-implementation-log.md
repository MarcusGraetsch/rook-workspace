# System-Audit Implementierungslog

> **Quelle:** `/root/system-audit-reports/impl-plan-rook-und-phoenix.md`
> **Gestartet:** 2026-05-08
> **Agent:** Rook

---

## Phase 0 — Quick Wins

### S-R1: SSH-Hardening ✅

**Durchgeführt:** 2026-05-08 ~18:15

**Aktionen:**
- `/etc/ssh/sshd_config.d/50-cloud-init.conf.disabled` entfernt (enthielt `PasswordAuthentication yes`)
- `/etc/ssh/sshd_config.d/99-hardening.conf` erstellt mit:
  ```
  PasswordAuthentication no
  PermitRootLogin no
  MaxAuthTries 3
  Port 6262
  PubkeyAuthentication yes
  ```
- Rechte auf `600` gesetzt
- `sshd -t` bestanden
- `systemctl reload sshd` erfolgreich

**Verifikation:**
```
$ /usr/sbin/sshd -T | grep -E "(passwordauthentication|permitrootlogin|port)"
passwordauthentication no
permitrootlogin no
port 6262
```

**Hinweis:** Bestehende Config war bereits gehärtet (Port 6262, PasswordAuthentication no, PermitRootLogin no). 99-hardening.conf macht dies explizit und zukunftssicher.

---

## Offene Phase-0-Tasks

- [ ] S-R2: GitLab-Compose Bindings 0.0.0.0 → 127.0.0.1
- [ ] S-R3: Docker-Registry Bind auf 127.0.0.1:5000 + htpasswd-Auth
- [ ] S-R4: Cloudflared argocd-Eintrag YAML-Doppelschlüssel entfernen
- [ ] S-R5: Cloudflare-Access für admin-Subdomains
- [ ] S-R6: CUPS auf localhost:631 beschränken
- [ ] S-R7: Server-untypische Snaps entfernen
- [ ] S-R8: unattended-upgrades konfigurieren

---

*Log erstellt: 2026-05-08*
*Next update: nach S-R8*
