# openclaw-update

Update OpenClaw packages safely without breaking running sessions.

## Trigger Condition

Löse dieses Skill aus wenn:
- Ein CVE oder Security-Update für OpenClaw erkannt wird
- Ein `npm install -g openclaw` ohne dieses Skill geplant ist
- OpenClaw auf eine neue Major/Minor Version aktualisiert werden soll

## Pre-Flight Check

VOR jedem Update:

```bash
# 1. Prüfe ob andere Sessions aktiv sind
ACTIVE_SESSIONS=$(find ~/.openclaw/agents/rook/sessions/ -name "*.jsonl" -mmin -60 | wc -l)
if [ "$ACTIVE_SESSIONS" -gt 1 ]; then
  echo "⚠️  $ACTIVE_SESSIONS aktive Sessions gefunden. Warte 5 Minuten..."
  sleep 300
fi

# 2. Prüfe Cron-Job Status (sollten nicht gleichzeitig laufen)
# Daily Research: 7:30 Uhr
# Community Intelligence: 10:00 Uhr (Di/Fr)
# Wiki Lint: 10:00 Uhr (1. ungerader Monat)
CURRENT_HOUR=$(date +%H)
CURRENT_MIN=$(date +%M)
if [ "$CURRENT_HOUR" -eq 7 ] && [ "$CURRENT_MIN" -ge 25 ]; then
  echo "⚠️  Daily Research Cron läuft bald. Update verschieben."
  exit 1
fi
```

## Workflow

### Phase 1: Backup & Stop

Backup der Config und Agent-Sessions:

```bash
TIMESTAMP=$(date +%Y%m%d%H%M)
cp -r ~/.openclaw/openclaw.json ~/.openclaw/backup/openclaw.json.$TIMESTAMP
cp -r ~/.openclaw/agents ~/openclaw-agents-backup.$TIMESTAMP
```

### Phase 2: Graceful Shutdown

```bash
# Aktive Sessions beenden (nicht löschen!)
# Warte auf laufende Cron-Jobs
sleep 10

# Gateway zuerst stoppen
systemctl --user stop openclaw-gateway.service
sleep 3

# Node stoppen
systemctl --user stop openclaw-node.service
sleep 5
```

### Phase 3: Update

```bash
# Alte npm Locks aufräumen
rm -rf /usr/lib/node_modules/.openclaw* /usr/lib/node_modules/openclaw

# npm install (kein @latest — nimm die angeforderte Version oder latest stable)
npm install -g openclaw@latest 2>&1
```

### Phase 4: Verify

```bash
# Version prüfen
openclaw --version
npm list -g openclaw --depth=0
```

### Phase 5: Restart Services

```bash
# Gateway zuerst starten
systemctl --user start openclaw-gateway.service
sleep 3

# Node starten
systemctl --user start openclaw-node.service
sleep 5

# Health Check mit Retry
for i in 1 2 3 4 5; do
  HEALTH=$(curl -s http://localhost:18789/health)
  if echo "$HEALTH" | grep -q '"ok":true'; then
    echo "✅ Health Check bestanden"
    break
  fi
  echo "⏳ Versuch $i/5..."
  sleep 5
done
```

### Phase 6: Session Cleanup

Falls eine Rook-Telegram-Session hängt (exec npm hängt):

```bash
# Finde gestrandete Session-Files (nur Rook Telegram, nicht Cron-Sessions)
rm -f ~/.openclaw/agents/rook/sessions/*-telegram-*.jsonl.bak-*

# Prüfe ob sessions.json aktualisiert wurde
python3 -c "
import json, datetime
with open('~/.openclaw/agents/rook/sessions/sessions.json') as f:
    d = json.load(f)
telegram = d.get('agent:rook:telegram:direct:549758481', {})
print('Telegram Session:', datetime.datetime.fromtimestamp(telegram.get('updatedAt', 0)/1000))
"
```

## Cron-Job Schedule (Aktuell)

| Job | Zeit | Tag |
|-----|------|-----|
| Daily Research | 7:30 | Täglich |
| Community Intelligence | 10:00 | Di, Fr |
| Wiki Weekly Review | 10:00 | Sonntag |
| Wiki Bi-Monthly Lint | 10:00 | 1. ungerader Monat |

**Mindestens 30 Minuten Abstand zwischen Updates und Cron-Jobs einhalten!**

## Pitfalls

- **Führe NIE `npm install` im laufenden Session-Kontext aus** — der exec-Handler blockiert. Nutze immer dieses Skill.
- **Stoppe Gateway VOR Node** — sonst gibt es protocol mismatch.
- **Warte auf aktive Sessions** — nie updaten während Cron-Jobs laufen.
- **Lösche keine Cron-Sessions** — nur `*-telegram-*` Sessions.
- **Warte 5s nach Node-Restart** — der Node braucht Zeit für Protocol-Handshake mit Gateway.

## Verification

Nach jedem Update:
1. Health-Check: `curl http://localhost:18789/health` → `{"ok":true,"status":"live"}`
2. Rook Telegram: schreib ihm etwas — er muss antworten
3. Check RAM: Node sollte < 300MB haben (sonst: Restart)
4. Cron-Jobs prüfen: `cron list` — sollten keine Fehler zeigen
