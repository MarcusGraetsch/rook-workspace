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

**Hinweis:** Bestehende Config war bereits gehärtet. 99-hardening.conf macht dies explizit und zukunftssicher.

---

### S-R2: GitLab-Compose Bindings 0.0.0.0 → 127.0.0.1 ✅ (bereits erledigt)

**Status:** Pre-Audit bereits konfiguriert

**Verifikation:**
```
$ docker ps --format "table {{.Names}}\t{{.Ports}}" | grep gitlab
gitlab  127.0.0.1:8022->22/tcp, 127.0.0.1:8090->80/tcp, 127.0.0.1:8443->443/tcp
```

---

### S-R3: Docker-Registry Bind auf 127.0.0.1:5000 + htpasswd-Auth ✅ (bereits erledigt)

**Status:** Pre-Audit bereits konfiguriert

**Verifikation:**
```
$ ss -tlnp | grep :5000
LISTEN 0 4096 127.0.0.1:5000 0.0.0.0:* users:(("docker-proxy",pid=...))

$ docker inspect registry --format '{{json .HostConfig.PortBindings}}'
{"5000/tcp": [{"HostIp": "127.0.0.1", "HostPort": "5000"}]}

$ curl -s http://localhost:5000/v2/_catalog
{"errors":[{"code":"UNAUTHORIZED",...}]}
```

**Auth:** `REGISTRY_AUTH=htpasswd`, `REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd` aktiv.

---

### S-R4: Cloudflared argocd-Eintrag YAML-Doppelschlüssel ✅ (kein Bug gefunden)

**Status:** Kein Doppelschlüssel vorhanden — Config ist valide

**Verifikation:**
```
$ python3 -c "import yaml; data = yaml.safe_load(open('/etc/cloudflared/config.yml')); hosts = [i.get('hostname') for i in data.get('ingress', []) if 'hostname' in i]; print('Hosts:', hosts)"
Hosts: ['dashboard.working-notes.org', 'k8portal.working-notes.org', 'argocd.working-notes.org', 'keycloak.working-notes.org', 'polaris.working-notes.org', 'gitlab.working-notes.org', 'n8n.working-notes.org']

$ curl -sI https://argocd.working-notes.org | head -3
HTTP/2 307 → / (307 redirect, service reachable)

$ curl -skL https://keycloak.working-notes.org | head -3
<!-- ~ Copyright 2016 Red Hat... --> (Keycloak Login)
```

**Hinweis:** ArgoCD und Keycloak sind beide über den Tunnel erreichbar. Kein Bug. Config ist sauber.

---

### S-R6: CUPS auf localhost:631 ✅ (nicht installiert)

**Status:** CUPS nicht auf diesem System

**Verifikation:** `ss -tlnp | grep :631` → leer, `systemctl status cups` → nicht gefunden

---

### S-R7: Server-untypische Snaps entfernen ✅ (keine gefunden)

**Status:** Keine server-untypischen Snaps (chromium, gnome, mesa)

**Verifikation:**
```
$ snap list
bare, core20, core22, core24, snapd — nur Base-Snaps
```

---

### S-R8: unattended-upgrades konfigurieren ✅ (bereits korrekt)

**Status:** Pre-Audit bereits korrekt konfiguriert

**Verifikation:**
```
$ grep Automatic-Reboot /etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Automatic-Reboot "false";
```

---

### S-R5: Cloudflare-Access für admin-Subdomains ⚠️ (nicht aktiviert)

**Status:** Cloudflare Access ist NICHT aktiv für die Subdomains

**Prüfung:** Keine `cf-access-*` Headers bei gitlab, n8n, argocd, keycloak

**Entscheidung nötig:** Cloudflare Access (E-Mail-OTP) für diese Subdomains aktivieren?

---

## Phase 0 Zusammenfassung

| Task | Status | Quelle |
|------|--------|--------|
| S-R1 SSH-Hardening | ✅ Erledigt | 99-hardening.conf erstellt |
| S-R2 GitLab-Bindings | ✅ Bereits korrekt | 127.0.0.1:8090 |
| S-R3 Docker-Registry | ✅ Bereits korrekt | 127.0.0.1:5000 + htpasswd |
| S-R4 Cloudflared argocd | ✅ Kein Bug | Config valide, Ingress erreichbar |
| S-R5 Cloudflare-Access | ⚠️ Nicht aktiviert | Entscheidung nötig |
| S-R6 CUPS | ✅ Nicht installiert | N/A |
| S-R7 Snaps | ✅ Keine auffälligen | Nur Base-Snaps |
| S-R8 unattended-upgrades | ✅ Bereits korrekt | Automatic-Reboot=false |

---

## Offene Punkte (Marcus-Entscheidung nötig)

- **S-R5:** Cloudflare Access für admin-Subdomains aktivieren? (E-Mail-OTP)
- **S-G1:** Comfy-Token rotieren (Entscheidung + Ausführung)
- **O2:** ArgoCD nutzen oder entfernen?

---

## Phase 1 — Stabilisierung

### P1-R1: etcd-Snapshot-Cron für KIND ✅ (abgeschlossen, Restore-Test geplant)

**Durchgeführt:** 2026-05-08 ~18:20

**Aktionen:**
- etcdctl v3.5.15 installiert (`/usr/local/bin/etcdctl-v3`)
- etcd-Zertifikate vom KIND-Container auf Host kopiert
- Snapshot-Script erstellt: `operations/bin/backup-etcd-kind.sh`
- Cron eingerichtet: Täglich 02:00
- Retention: 14 Tage (lokal + remote)
- Off-site: rclone → `gdrive:DigitalCapitalismBackups/etcd-kind`

**Verifikation:**
```
$ etcdctl snapshot save → 64MB Snapshot
$ rclone copy → Upload abgeschlossen
$ crontab -l | grep backup-etcd-kind
0 2 * * * /root/.openclaw/workspace/operations/bin/backup-etcd-kind.sh
```

**Restore-Test:** Geplant (separater Cluster-Test nötig)

---

## Offene Phase-1-Tasks

- [ ] P1-R2: Postgres-Dumps für 3 DBs
- [ ] P1-R3: Cloudflare-Tunnel-Creds + .env* als age-Tar
- [ ] P1-R4: gitlab-secrets.json + gitlab.rb in Backup
- [ ] P1-R5: n8n N8N_ENCRYPTION_KEY exportieren
- [ ] P1-R7: Keycloak 17.0.1-LEGACY → ≥24.x migrieren
- [ ] P1-R8: Alle :latest-Tags pinnen
- [ ] P1-R9: ArgoCD-Entscheidung
- [ ] P1-R10: nginx tote Upstreams entfernen
- [ ] P1-R11: nginx Security-Header
- [ ] P1-R14: SECURITY/XXX-Markierungen → GitHub Issues
- [ ] P1-R15: weekly_backup.log debuggen
- [ ] P1-R16: Healthchecks.io-Heartbeats

---

## Offene Punkte (Marcus-Entscheidung nötig)

- **S-R5:** Cloudflare Access für admin-Subdomains aktivieren? (E-Mail-OTP)
- **S-G1:** Comfy-Token rotieren (Entscheidung + Ausführung)
- **O2:** ArgoCD nutzen oder entfernen?

---

*Log erstellt: 2026-05-08*
*Letztes Update: Phase 0 abgeschlossen (S-R1..S-R8)*