# Claude-Mem Installation

## Status: ✅ AKTIV

**Installiert:** 2026-03-20
**Version:** 10.6.1
**Worker:** http://localhost:37777

## Was ist Claude-Mem?

Ein Memory-Plugin für Claude Code, das automatisch:
- Jede Session aufzeichnet
- Kontext über Sessions hinweg bewahrt
- Semantische Suche ermöglicht
- Progressive Disclosure nutzt

## Installation

### 1. Repository geklont
```bash
cd /root/.openclaw
git clone https://github.com/thedotmack/claude-mem.git
```

### 2. Dependencies installiert
- Node.js packages (npm install)
- Bun Runtime (1.3.11)
- uv (Python für Vector Search)

### 3. Worker Service gestartet
```bash
bun run plugin/scripts/worker-service.cjs start
```
**Status:** Läuft auf Port 37777

### 4. Hooks installiert
- `~/.claude/hooks/session-start`
- `~/.claude/hooks/user-prompt-submit`
- `~/.claude/hooks/post-tool-use`
- `~/.claude/hooks/stop`
- `~/.claude/hooks/session-end`

## Verwendung

### Web UI
```bash
# Direkt auf VM
curl http://localhost:37777

# Oder SSH Port Forwarding:
ssh -L 37777:localhost:37777 root@vmd151897.contaboserver.net -p 6262
# Dann: http://localhost:37777 im Browser
```

### mem-search Skill
Claude kann jetzt automatisch:
```
"Was haben wir gestern über Noctiluca besprochen?"
→ Claude durchsucht Memory und findet Kontext
```

## Konfiguration

**Settings:** `~/.claude-mem/settings.json`
```json
{
  "aiModel": "claude-3-5-sonnet-20241022",
  "workerPort": 37777,
  "dataDir": "/root/.claude-mem/data",
  "contextInjection": {
    "enabled": true,
    "maxTokens": 2000
  }
}
```

## Datenbank

- **SQLite:** `~/.claude-mem/data/observations.db`
- **Chroma:** Vector DB für semantische Suche
- **FTS5:** Full-Text Search

## Nützliche Befehle

```bash
# Worker Status prüfen
curl http://localhost:37777/api/health

# Worker Logs
cd ~/.claude/plugins/marketplaces/thedotmack
bun run worker:logs

# Worker neustarten
bun run worker:restart

# Manuelle Suche
curl "http://localhost:37777/api/search?q=noctiluca"
```

## Integration mit OpenClaw

Claude-Mem ist jetzt Teil unseres Setups:
- Jede Konversation wird gespeichert
- Kontext wird automatisch injiziert
- Suche über alle vergangenen Sessions

## Wichtige Pfade

| Pfad | Beschreibung |
|------|--------------|
| `~/.claude-mem/data/` | SQLite DB + Chroma |
| `~/.claude-mem/logs/` | Worker Logs |
| `~/.claude/hooks/` | Lifecycle Hooks |
| `~/.bun/bin/bun` | Bun Runtime |

## Sicherheit

- Memory-Daten bleiben lokal auf VM
- Keine Cloud-Synchronisation
- API Key in `~/.claude-mem/settings.json` (wenn gesetzt)

## Troubleshooting

**Worker startet nicht:**
```bash
export PATH="$HOME/.bun/bin:$PATH"
bun run plugin/scripts/worker-service.cjs start
```

**Port belegt:**
```bash
lsof -i :37777
kill <PID>
```

## Nächste Schritte

- [x] Installation
- [x] Worker läuft
- [x] Hooks aktiv
- [ ] Test: In nächster Session prüfen ob Kontext geladen wird
- [ ] Web UI via SSH Port Forwarding testen

---

*Automatische Memory-Persistenz für alle zukünftigen Sessions aktiviert!*
