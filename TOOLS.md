# TOOLS.md - Lokale Konfiguration & Notizen

## VM / Server

- **Host:** vmd151897
- **OS:** Linux 5.15.0-173-generic (x64)
- **Node:** v22.22.1
- **Disk:** 1.2TB gesamt, ~32GB verwendet
- **Shell:** sh (bash/zsh verfügbar)

## Git

- **User:** Marcus Grätsch
- **Email:** marcusgraetsch@gmail.com
- **Auth:** SSH Keys konfiguriert
- **Repos:** Siehe MEMORY.md → Infrastruktur

## OpenClaw

- **Version:** Aktuell (regelmäßige Updates via `openclaw update`)
- **Workspace:** `~/.openclaw/workspace/`
- **Rook-Agent:** `~/.openclaw/rook-agent/`
- **Default Model:** Kimi K2.5 (`kimi-coding/k2p5`)
- **Channel:** Telegram (Hauptkanal mit Marcus)
- **Gateway:** Läuft auf der VM

## Cron-Jobs

| Schedule | Job | Log |
|----------|-----|-----|
| Täglich 02:00 | `sync-from-workspace.sh` → rook-agent sync | `/var/log/rook-sync.log` |
| Sonntags 08:00 | Weekly Research Pipeline | `workspace/research/cron.log` |
| Sonntags 02:00 | Google Drive Backup | `/var/log/weekly_backup.log` |

Scripts: `~/.openclaw/rook-agent/scripts/`

## Telegram

- **Chat-Type:** Direct (1:1 mit Marcus)
- **Chat-ID:** telegram:549758481
- **Capabilities:** Inline Buttons, Reactions (MINIMAL mode)

## Google Services (gog CLI)

- **Status:** ⚠️ Noch nicht installiert
- **Plan:** `brew install steipete/tap/gogcli` oder manuell
- **Services:** Gmail, Calendar, Drive, Contacts, Sheets, Docs
- **Auth:** OAuth2 Setup nötig

## Skills

- **Installiert:** Diverse (in `~/.openclaw/workspace/skills/`)
  - summarize
  - multi-search-engine
  - ontology
  - proactive-agent-lite
  - self-improving-agent
  - hallucination-prevention (2026-04-15) ✅ NEU
- **Geplant:** Eigene Skills bauen (nach Aaron's Tipp)
- **Referenz:** https://clawskills.sh/ (5.400+ Skills)

### Halluzinations-Prävention

- **Skill:** `skills/hallucination-prevention.md`
- **Regel:** Jede Behauptung mit spezifischen Namen, Daten, Zitaten oder Fakten muss vor Ausgabe geprüft werden.
- **Anlass:** KI-Modell-Vergleich – Halluzination bei Patricia Evangelista (unbelegter Name)

## Bekannte Probleme

- **Git index.lock:** Tritt gelegentlich auf bei parallelen Git-Operationen → `rm -f .git/index.lock`
- **Kimi Rate Limits:** Bei intensiver Nutzung (lange Sessions) → Fallback auf OpenAI planen
- **Core-Dateien:** OpenClaw schreibt AGENTS.md, SOUL.md, etc. immer wieder ins Workspace → Sync-Cron löst das
- **Podcast-Dateien:** >100MB, in .gitignore, nur lokal vorhanden
- **web_fetch:** Funktioniert manchmal nicht (Timeout/DNS) → web_search als Alternative
- **Reddit:** Blockiert direkten Fetch (403) → Web-Suche oder User kopiert Inhalt

## Nützliche Befehle

```bash
# OpenClaw Status
openclaw status

# Git Sync manuell
~/.openclaw/rook-agent/scripts/sync-from-workspace.sh

# Cron-Jobs anzeigen
crontab -l

# Disk Usage
df -h /

# Prozesse checken
ps aux | grep openclaw
```

---

*Letzte Aktualisierung: 2026-03-27*

## OpenClaw RPA (Browser Automation)

- **Skill:** `skills/openclaw-rpa/` (Submodule in rook-agent)
- **Wrapper:** `skills/custom/rpa-run.sh` (funktioniert aus jedem Projekt-Kontext)
- **Trigger:** `#rpa`, `#rpa-api`, `#rpa-login`, `#rpa-list`, `#rpa-run:<name>`

**Nutzung:**
```bash
# Wrapper (aus jedem Verzeichnis):
rpa-run.sh env-check   # Verify OK
rpa-run.sh list        # Alle Tasks
rpa-run.sh run <name>   # Replay einen Task

# Oder direkt im Skill-Verzeichnis:
cd ~/.openclaw/rook-agent/skills/openclaw-rpa
source .venv/bin/activate
python3 rpa_manager.py <command>
```

**Typische Tasks:**
- Web: Login → navigieren → extrahieren → ausfüllen
- API: REST Calls mit HTTP
- Excel/Word: Office-Dateien ohne Office

**Kosten:** Erste Aufnahme = Token. Jeder Replay = $0 (reines Python).
