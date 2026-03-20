# Claude-Mem Installation

## Status: ✅ AKTIV

**Installiert:** 2026-03-20
**Version:** 10.6.1
**Worker:** http://localhost:37777
**Plugin:** Aktiviert in `~/.claude/settings.json`

---

## Was ist Claude-Mem?

Ein **Memory-Plugin für Claude Code**, das automatisch:
- Jede Session aufzeichnet
- Kontext über Sessions hinweg bewahrt
- Semantische Suche ermöglicht
- Progressive Disclosure nutzt

---

## Architektur

```
┌─────────────────────────────────────────┐
│           CLAUDE CODE 2.1.80            │
│              (Anthropic)                │
└──────────────┬──────────────────────────┘
               │ Lädt Plugin automatisch
               ▼
┌─────────────────────────────────────────┐
│         CLAUDE-MEM PLUGIN               │
│  ~/.claude/plugins/marketplaces/        │
│  thedotmack/claude-mem/plugin/          │
│                                         │
│  • Native Hooks (hooks.json)            │
│  • Setup Script                         │
│  • Bun-Runner                           │
└──────────────┬──────────────────────────┘
               │ Startet/Verwendet
               ▼
┌─────────────────────────────────────────┐
│           WORKER SERVICE                │
│         Port 37777 (HTTP)               │
│                                         │
│  • SQLite DB (claude-mem.db)            │
│  • Chroma Vector DB                     │
│  • FTS5 Full-Text Search                │
│  • MCP Server                           │
└─────────────────────────────────────────┘
```

---

## Installation (Durchgeführt)

### 1. Repository geklont
```bash
cd /root/.openclaw
git clone https://github.com/thedotmack/claude-mem.git
```

### 2. Dependencies installiert
```bash
cd claude-mem
npm install
npm run build
npm run sync-marketplace
```

### 3. Bun Runtime installiert
```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
```

### 4. Worker Service gestartet
```bash
bun run plugin/scripts/worker-service.cjs start
```
**Status:** Läuft auf Port 37777

### 5. Plugin aktiviert
```bash
cat > ~/.claude/settings.json << 'EOF'
{
  "plugins": {
    "enabled": ["thedotmack/claude-mem"]
  }
}
EOF
```

### 6. Claude Code installiert
```bash
npm install -g @anthropic-ai/claude-code
claude login  # Mit deinem Pro-Account
```

---

## Native Plugin Hooks (Aktiv)

Claude-Mem nutzt **keine Bash-Hooks** mehr, sondern native Plugin-Hooks:

| Hook | Wann ausgelöst | Funktion |
|------|----------------|----------|
| **Setup** | Bei Plugin-Initialisierung | Installiert Dependencies |
| **SessionStart** | `claude` startet | Startet Worker, lädt Kontext |
| **UserPromptSubmit** | Du sendest Nachricht | Speichert Input |
| **PostToolUse** | Nach Tool-Aufruf | Speichert Ergebnisse |
| **SessionEnd** | Session endet | Finale Speicherung |

**Konfiguration:** `~/.claude/plugins/marketplaces/thedotmack/plugin/hooks/hooks.json`

---

## Verwendung

### Neue Session starten
```bash
claude
```

Das Plugin lädt automatisch:
1. Worker startet (falls nicht läuft)
2. Kontext aus vorherigen Sessions wird geladen
3. Alle Eingaben/Ergebnisse werden gespeichert

### Memory durchsuchen
```bash
# Via Web API
curl "http://localhost:37777/api/search?query=Noctiluca&limit=5"

# Via Web UI (Browser)
# http://localhost:37777
```

### Innerhalb von Claude
```
Du: "Was haben wir letzte Woche über MoltCities gesagt?"
Claude: [Durchsucht Memory automatisch]
```

---

## Web UI Zugriff

### Direkt auf VM
```bash
curl http://localhost:37777
```

### Von Laptop via SSH Port Forwarding
```bash
ssh -L 37777:localhost:37777 root@vmd151897.contaboserver.net -p 6262
# Dann im Browser: http://localhost:37777
```

---

## Wichtige Pfade

| Pfad | Beschreibung |
|------|--------------|
| `~/.claude/settings.json` | Plugin-Aktivierung |
| `~/.claude/plugins/marketplaces/thedotmack/` | Plugin-Dateien |
| `~/.claude-mem/claude-mem.db` | SQLite Datenbank |
| `~/.claude-mem/data/` | Chroma Vector DB |
| `~/.bun/bin/bun` | Bun Runtime |
| `~/.claude/sessions/` | Session-Dateien |

---

## Troubleshooting

### Worker nicht erreichbar
```bash
# Status prüfen
curl http://localhost:37777/api/health

# Manuell starten
export PATH="$HOME/.bun/bin:$PATH"
cd ~/.claude/plugins/marketplaces/thedotmack
bun run plugin/scripts/worker-service.cjs start
```

### Plugin nicht geladen
```bash
# settings.json prüfen
cat ~/.claude/settings.json

# Sollte enthalten:
# { "plugins": { "enabled": ["thedotmack/claude-mem"] } }
```

### Port belegt
```bash
lsof -i :37777
kill <PID>
```

### Datenbank leer
- Erst nach **erster Claude-Session** mit aktivem Plugin
- Worker speichert automatisch

---

## Legacy: Bash-Hooks (NICHT MEHR NÖTIG)

Die Bash-Hooks in `~/.claude/hooks/` sind **veraltet** und werden nicht verwendet:
- ❌ `session-start` (Bash-Version)
- ❌ `user-prompt-submit` (Bash-Version)
- ❌ `post-tool-use` (Bash-Version)
- ❌ `stop` (Bash-Version)
- ❌ `session-end` (Bash-Version)

**Claude-Mem nutzt jetzt Native Plugin Hooks!**

**Aufräumen (optional):**
```bash
rm -rf ~/.claude/hooks/
```

---

## Sicherheit

- Memory-Daten bleiben **lokal auf VM**
- SQLite DB: `~/.claude-mem/claude-mem.db`
- Keine Cloud-Synchronisation
- API Keys in `~/.claude/.credentials.json`

---

## Nächste Schritte

- [x] Installation
- [x] Worker läuft
- [x] Plugin aktiviert
- [x] Claude Code verbunden
- [ ] **Test:** Neue `claude`-Session starten und Memory testen
- [ ] Web UI via SSH Port Forwarding testen

---

**Claude hat jetzt echtes, persistierendes Gedächtnis! 🧠✨**
