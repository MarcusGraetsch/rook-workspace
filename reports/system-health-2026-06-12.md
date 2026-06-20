# System-Überprüfung Report
**Datum:** 2026-06-12 16:55 CEST  
**Host:** vmd151897  
**OS:** Ubuntu 22.04.5 LTS (Jammy)  
**Kernel:** 5.15.0-176-generic  
**Uptime:** 45 Tage, 18 Stunden

---

## 1. Ressourcenverbrauch

| Ressource | Status | Wert | Bewertung |
|-----------|--------|------|-----------|
| **CPU-Load** | 🔴 | 14.37 (1/5/15min) | Extrem hoch |
| **RAM** | 🟡 | 12GB / 23GB used (52%) | Moderat, aber... |
| **Swap** | 🔴 | 8.5GB / 11GB used (77%) | Zu hoch |
| **Disk** | 🔴 | 967GB / 1.2TB (84%) | Kritisch |
| **Prozesse** | 🟢 | 524 total | Normal |
| **Zombies** | 🟢 | 0 | Gut |

### Top 5 CPU-Verbraucher
| Prozess | CPU% | MEM% | PID | Bemerkung |
|---------|------|------|-----|-----------|
| kube-apiserver | 38.9 | 6.9 | 463606 | K8s Control Plane |
| sidekiq (GitLab) | 38.7 | 5.9 | 3257550 | GitLab Background Jobs |
| kubelet | 21.5 | 0.3 | 4110283 | K8s Node Agent |
| openclaw gateway | 20.8 | 1.6 | 3650593 | OpenClaw Gateway |
| etcd | 14.3 | 0.6 | 4110813 | K8s Datenbank |

### Top 5 MEM-Verbraucher
| Prozess | MEM% | RSS | Bemerkung |
|---------|------|-----|-----------|
| kube-apiserver | 6.9 | 1.7GB | K8s |
| midpoint (Java) | 6.4 | 1.6GB | IDM |
| sidekiq | 5.9 | 1.5GB | GitLab |
| puma (GitLab) | 5.4 | 1.3GB | GitLab |
| puma (GitLab) | 3.9 | 962MB | GitLab |

**Analyse:** Kubernetes + GitLab sind die Hauptverbraucher. Die Kombination aus kind-Cluster, GitLab, midPoint und Prometheus/Grafana überlastet die VM deutlich. Swap-Nutzung von 77% ist ein Indikator für RAM-Druck.

---

## 2. Neustart-Bedarf

| Prüfung | Status | Details |
|---------|--------|---------|
| **Reboot-Required** | 🔴 **JA** | `/var/run/reboot-required` existiert |
| **Kernel** | 🔴 | 5.15.0-176 läuft, **5.15.0-181** verfügbar |
| **Dienste-Neustart** | 🟡 | 6 Dienste brauchen Restart |
| **Uptime** | 🟡 | 45 Tage ohne Reboot |

### Dienste die Neustart benötigen (needrestart)
- `dbus.service`
- `docker.service`
- `networkd-dispatcher.service`
- `systemd-logind.service`
- `unattended-upgrades.service`
- `user@0.service`

### Letzte Paket-Aktivität
- **Heute 11:45** — `apt upgrade` durchgeführt (von root)
- **Gestern** — mehrere `unattended-upgrade` Läufe

---

## 3. Security-Status

### Netzwerk & Firewall
| Prüfung | Status | Details |
|---------|--------|---------|
| **UFW** | 🟢 aktiv | SSH (6262), nginx (13001), docker bridges erlaubt |
| **SSH Port** | 🟢 non-standard | Port 6262 statt 22 |
| **AppArmor** | 🟢 aktiv | 80 Profile in enforce mode |
| **SELinux** | 🟡 | Nicht aktiv (Ubuntu-Standard) |
| **Öffentliche Ports** | 🟡 | Port 80 (nginx) öffentlich erreichbar |

### Offene Ports (Listening)
- **6262/tcp** — SSH (0.0.0.0 + ::) ✅ erwartet
- **80/tcp** — nginx (0.0.0.0 + ::) ⚠️ öffentlich
- **18789/tcp** — OpenClaw Gateway (127.0.0.1 + ::1) ✅ localhost only
- **35355/tcp** — OpenClaw (127.0.0.1) ✅ localhost only
- **13001/tcp** — nginx auf docker0 (172.17.0.1) ✅ intern
- **127.0.0.1:xxx** — Docker-Proxies für GitLab, n8n, K8s, Registry, Postgres, NATS, Tika, MCP-Gateway ✅ localhost only

### Aktive Verbindungen (extern)
| Lokale IP | Remote IP | Dienst | Bewertung |
|-----------|-----------|--------|-----------|
| 178.18.254.21:43718 | 162.159.135.234:443 | Hermes Agent | 🟢 Cloudflare (erwartet) |
| 178.18.254.21:6262 | 84.140.157.25:55752 | SSH | 🟢 Deine aktuelle Session |
| 172.20.0.1:50170 | 172.20.0.2:80 | Docker-Proxy | 🟢 Intern |

### Authentifizierung & Logins
| Prüfung | Status | Details |
|---------|--------|---------|
| **Failed Logins** | 🟢 | Nur Banner-Exchange-Fehler (Port-Scanning/Probing), keine erfolgreichen Brute-Force-Versuche |
| **Sudo-Aktionen** | 🟢 | Nur root selbst, heute: `apt update` + `apt upgrade` |
| **Logins heute** | 🟢 | 1x root von 84.140.157.25 (deine IP) |
| **Last logins** | 🟢 | Regelmäßige Sessions von bekannten IPs (84.140.x.x, 80.187.x.x) |

### Malware / Trojaner Indikatoren
| Prüfung | Status | Details |
|---------|--------|---------|
| **Unbekannte Prozesse** | 🟢 | Alle Prozesse identifiziert und legitime |
| **Unbekannte Verbindungen** | 🟢 | Keine verdächtigen ausgehenden Verbindungen |
| **Cron-Jobs** | 🟢 | Nur bekannte System-Crons + certbot, idp-backups, staticroute |
| **Systemd-Failures** | 🔴 | 5 Services failed (siehe unten) |

---

## 4. Fehlerhafte Dienste

| Service | Status | Seit | Ursache | Bewertung |
|---------|--------|------|---------|-----------|
| **openclaw-gateway.service** | 🔴 failed | 3 Tage (Di 16:28) | Exit-Code 1, 5 Restart-Versuche | **Kritisch** — alte Version (2026.4.15) |
| **openclaw-node.service** | 🔴 failed | 2 Tage (Mi 00:01) | Exit-Code 1, 6 Restart-Versuche | **Kritisch** — alte Version (2026.4.27) |
| **rook-dashboard-watchdog.service** | 🔴 failed | 1 Min | Exit-Code 7 | Dashboard nicht erreichbar |
| **rook-health-refresh.service** | 🔴 failed | 22 Min | curl Exit-Code 7 (keine Verbindung) | Dashboard nicht erreichbar |
| **systemd-networkd-wait-online** | 🔴 failed | 2 Tage | Timeout | Bekannter VM-Bug, harmlos |

**Analyse:** Die OpenClaw-Systemd-Services (gateway + node) sind auf alten Versionen und failen seit Tagen. Der OpenClaw Gateway läuft aber trotzdem (PID 3650593) — vermutlich manuell gestartet oder via anderer Methode. Die Dashboard-Services failen weil das Dashboard auf Port 3001 nicht erreichbar ist.

---

## 5. Docker-Container

| Container | Status | Seit | Bemerkung |
|-----------|--------|------|-----------|
| gitlab | Up 5 Wochen | healthy | Sehr lange Uptime |
| gitlab-runner | Up 4 Wochen | | Sehr lange Uptime |
| registry | Up 5 Wochen | | Sehr lange Uptime |
| n8n-n8n-1 | Up 5 Wochen | healthy | Sehr lange Uptime |
| rook-lab-control-plane | Up 5 Wochen | | K8s kind cluster |
| compose-* | Up 12 Tage | | MCP-Services |

**Analyse:** Container laufen seit Wochen ohne Restart. Das ist nicht per se schlecht, aber nach 45 Tagen Host-Uptime sollten sie bei einem Reboot neu gestartet werden.

---

## 6. Empfohlene Aktionen

### 🔴 Dringend (sofort)

1. **System-Reboot durchführen**
   - Kernel 5.15.0-181 ist verfügbar und installiert
   - 6 Dienste brauchen Neustart
   - System läuft 45 Tage ohne Reboot
   - **Befehl:** `sudo reboot` (OpenClaw wird via systemd neu starten)

2. **Disk-Space aufräumen**
   - 84% voll ist kritisch — bei 90% wird das System instabil
   - **Befehle:**
     ```bash
     sudo docker system prune -a --volumes  # Docker-Overhead entfernen
     sudo journalctl --vacuum-time=7d       # Logs kürzen
     sudo apt autoremove --purge            # Alte Kernel/Pakete
     sudo logrotate -f /etc/logrotate.conf  # Logs rotieren
     du -sh /var/log/* /tmp/* /var/tmp/*    # Große Verzeichnisse finden
     ```

3. **Swap-Druck reduzieren**
   - 77% Swap-Nutzung bedeutet: RAM reicht nicht
   - Option A: Mehr RAM für die VM (bei Host-Provider)
   - Option B: Weniger Container/Dienste laufen lassen
   - Option C: `swappiness` reduzieren: `sudo sysctl vm.swappiness=10`

### 🟡 Wichtig (nach Reboot)

4. **Failed Systemd-Services fixen**
   - `openclaw-gateway.service` und `openclaw-node.service` prüfen
   - Die aktuell laufende OpenClaw-Version ist 2026.6.1 — die Systemd-Files zeigen 2026.4.15/2026.4.27
   - Lösung: Systemd-Unit-Files aktualisieren oder Services disablen wenn manueller Start bevorzugt wird

5. **Dashboard-Services prüfen**
   - `rook-dashboard.service` hat Permission-Denied auf CHDIR
   - `operations/bin/start-dashboard.sh` existiert nicht oder hat falsche Rechte
   - Services disablen oder Script fixen

6. **Logrotate für Docker-Container einrichten**
   - Container-Logs wachsen unbegrenzt und füllen die Disk
   - `/etc/docker/daemon.json` mit `log-opts` konfigurieren

### 🟢 Optional (Wartung)

7. **iostat installieren** für bessere IO-Monitoring
8. **mpstat installieren** für CPU-Monitoring
9. **Systemd-networkd-wait-online** fixen (bekannter VM-Bug: `systemctl mask` wenn nicht benötigt)
10. **Regelmäßige Health-Checks** automatisieren (siehe Skill)

---

## 7. Zusammenfassung

| Kategorie | Score | Bemerkung |
|-----------|-------|-----------|
| **Sicherheit** | 🟢 **Gut** | Firewall aktiv, SSH non-standard, keine Angriffe, keine Malware |
| **Stabilität** | 🟡 **Mäßig** | 5 Services failed, aber Core-System läuft |
| **Ressourcen** | 🔴 **Kritisch** | Disk 84%, Swap 77%, Load 14+ |
| **Aktualität** | 🟡 **Mäßig** | Kernel outdated, Reboot nötig, Pakete aktuell |

**Fazit:** Das System ist sicherheitstechnisch in Ordnung — keine Anzeichen für Hacks, Trojaner oder ungewollte Kommunikation. Aber es ist **ressourcenmäßig überlastet** und braucht **dringend einen Reboot** sowie **Disk-Cleanup**. Die Kombination aus Kubernetes, GitLab und allen anderen Diensten ist zu viel für die VM.

---
*Report generiert von Rook System Health Check Skill*
