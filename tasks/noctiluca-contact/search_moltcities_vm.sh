#!/bin/bash
# MoltCities Forensic Search Script for VM
# Searches for traces of MoltCities account creation on 2026-02-11

set -e

echo "🔍 FORENSISCHE SUCHE NACH MOLTCITIES-SPuren"
echo "============================================"
echo "Ziel: Account-Erstellung am 2026-02-11"
echo ""

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Datum definieren
TARGET_DATE="2026-02-11"
START_DATE="2026-02-10"
END_DATE="2026-02-13"

echo -e "${YELLOW}📁 1. Shell History durchsuchen...${NC}"

# Bash History
if [ -f ~/.bash_history ]; then
    echo "   → Prüfe ~/.bash_history..."
    if grep -i "molt\|curl.*api\|moltcities" ~/.bash_history 2>/dev/null | head -20; then
        echo -e "   ${GREEN}✅ MoltCities-Einträge in bash_history gefunden!${NC}"
    else
        echo -e "   ${RED}❌ Keine Einträge in ~/.bash_history${NC}"
    fi
else
    echo -e "   ${RED}❌ ~/.bash_history nicht gefunden${NC}"
fi

# Zsh History
if [ -f ~/.zsh_history ]; then
    echo "   → Prüfe ~/.zsh_history..."
    if grep -i "molt\|curl.*api\|moltcities" ~/.zsh_history 2>/dev/null | head -20; then
        echo -e "   ${GREEN}✅ MoltCities-Einträge in zsh_history gefunden!${NC}"
    else
        echo -e "   ${RED}❌ Keine Einträge in ~/.zsh_history${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📁 2. Browser Daten durchsuchen...${NC}"

# Chrome/Chromium
CHROME_PATHS=(
    "$HOME/.config/google-chrome/Default/History"
    "$HOME/.config/chromium/Default/History"
    "$HOME/.var/app/com.google.Chrome/config/google-chrome/Default/History"
)

for path in "${CHROME_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "   → Chrome History gefunden: $path"
        echo "   (SQLite DB - kopiere und untersuche mit sqlite3)"
        # Versuche sqlite3 Abfrage
        if command -v sqlite3 &> /dev/null; then
            echo "   → Suche nach 'molt' in History..."
            sqlite3 "$path" "SELECT url, title, datetime(last_visit_time/1000000-11644473600, 'unixepoch') as visit_time FROM urls WHERE url LIKE '%molt%' OR title LIKE '%molt%' LIMIT 20;" 2>/dev/null || echo -e "   ${RED}   ❌ SQLite Query fehlgeschlagen${NC}"
        fi
        break
    fi
done

# Firefox
FIREFOX_PROFILES=(
    "$HOME/.mozilla/firefox"
    "$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox"
)

for ff_path in "${FIREFOX_PROFILES[@]}"; do
    if [ -d "$ff_path" ]; then
        echo "   → Firefox Profile gefunden: $ff_path"
        # Suche nach places.sqlite
        find "$ff_path" -name "places.sqlite" -type f 2>/dev/null | while read -r db; do
            echo "   → Prüfe: $db"
            if command -v sqlite3 &> /dev/null; then
                sqlite3 "$db" "SELECT url, title FROM moz_places WHERE url LIKE '%molt%' OR title LIKE '%molt%' LIMIT 10;" 2>/dev/null || true
            fi
        done
    fi
done

echo ""
echo -e "${YELLOW}📁 3. System Logs (2026-02-10 bis 2026-02-13)...${NC}"

# Journalctl (systemd logs)
if command -v journalctl &> /dev/null; then
    echo "   → Prüfe journalctl..."
    if journalctl --since="$START_DATE" --until="$END_DATE" 2>/dev/null | grep -i "molt\|chrome\|curl" | head -20; then
        echo -e "   ${GREEN}✅ Einträge in System Logs gefunden${NC}"
    else
        echo -e "   ${RED}❌ Keine relevanten Einträge in journalctl${NC}"
    fi
fi

# Syslog
if [ -f /var/log/syslog ]; then
    echo "   → Prüfe /var/log/syslog..."
    if grep -i "molt\|curl.*api" /var/log/syslog 2>/dev/null | grep "$TARGET_DATE" | head -20; then
        echo -e "   ${GREEN}✅ Einträge in syslog gefunden${NC}"
    else
        echo -e "   ${RED}❌ Keine Einträge in syslog${NC}"
    fi
fi

# Auth Log
if [ -f /var/log/auth.log ]; then
    echo "   → Prüfe /var/log/auth.log..."
    grep "$TARGET_DATE" /var/log/auth.log 2>/dev/null | tail -10 || echo -e "   ${RED}❌ Keine Auth-Logs für $TARGET_DATE${NC}"
fi

echo ""
echo -e "${YELLOW}📁 4. Netzwerk-Logs und Connections...${NC}"

# Netstat/SS (aktive Connections)
if command -v ss &> /dev/null; then
    echo "   → Aktuelle Connections prüfen..."
    if ss -tuln 2>/dev/null | grep -i "molt"; then
        echo -e "   ${GREEN}✅ Aktive MoltCities-Verbindungen${NC}"
    else
        echo -e "   ${RED}❌ Keine aktiven MoltCities-Verbindungen${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📁 5. Config-Files und API Keys...${NC}"

# Suche nach moltcities in config files
echo "   → Suche in ~/.config..."
if find ~/.config -type f -name "*" 2>/dev/null | xargs grep -l "moltcities\|moltbook" 2>/dev/null | head -10; then
    echo -e "   ${GREEN}✅ Config-Files mit MoltCities gefunden${NC}"
else
    echo -e "   ${RED}❌ Keine Config-Files gefunden${NC}"
fi

# Suche nach API Keys oder Tokens
echo "   → Suche nach API Keys..."
if grep -r "sk-.*molt\|Bearer.*molt\|api_key.*molt" ~/.config ~/.openclaw 2>/dev/null | head -10; then
    echo -e "   ${GREEN}✅ API Keys gefunden${NC}"
else
    echo -e "   ${RED}❌ Keine API Keys gefunden${NC}"
fi

echo ""
echo -e "${YELLOW}📁 6. Git History (falls relevant)...${NC}"

# Git Commits am 11.02.2026
if [ -d /root/.openclaw/workspace/.git ]; then
    cd /root/.openclaw/workspace
    echo "   → Prüfe Git Commits vom $TARGET_DATE..."
    if git log --all --oneline --after="$START_DATE" --before="$END_DATE" 2>/dev/null; then
        echo -e "   ${GREEN}✅ Git Commits gefunden${NC}"
    else
        echo -e "   ${RED}❌ Keine Git Commits in diesem Zeitraum${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📁 7. Temporäre Dateien und Downloads...${NC}"

# Downloads
if [ -d ~/Downloads ]; then
    echo "   → Prüfe ~/Downloads..."
    if find ~/Downloads -type f -newermt "$START_DATE" ! -newermt "$END_DATE" 2>/dev/null | head -20; then
        echo -e "   ${GREEN}✅ Dateien in Downloads gefunden${NC}"
    else
        echo -e "   ${RED}❌ Keine Downloads in diesem Zeitraum${NC}"
    fi
fi

# Temp Files
if [ -d /tmp ]; then
    echo "   → Prüfe /tmp nach moltcities..."
    if find /tmp -type f -name "*molt*" 2>/dev/null | head -10; then
        echo -e "   ${GREEN}✅ Temp-Dateien mit 'molt' gefunden${NC}"
    else
        echo -e "   ${RED}❌ Keine Temp-Dateien mit 'molt'${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📁 8. OpenClaw spezifische Logs...${NC}"

# OpenClaw Sessions
if [ -d /root/.openclaw/agents/main/sessions ]; then
    echo "   → Prüfe OpenClaw Sessions..."
    # Suche nach Sessions vom 11.02
    find /root/.openclaw/agents/main/sessions -name "*.jsonl" -type f -newermt "$START_DATE" ! -newermt "$END_DATE" 2>/dev/null | while read -r session; do
        echo "   → Session: $session"
        if grep -i "molt\|moltcities\|evan" "$session" 2>/dev/null | head -5; then
            echo -e "   ${GREEN}✅ MoltCities-Einträge in Session gefunden${NC}"
        fi
    done
fi

# OpenClaw Config
if [ -f /root/.openclaw/openclaw.json ]; then
    echo "   → Prüfe openclaw.json..."
    if grep -i "molt\|evan" /root/.openclaw/openclaw.json 2>/dev/null; then
        echo -e "   ${GREEN}✅ Einträge in openclaw.json gefunden${NC}"
    else
        echo -e "   ${RED}❌ Keine Einträge in openclaw.json${NC}"
    fi
fi

echo ""
echo "============================================"
echo "🔍 FORENSISCHE SUCHE ABGESCHLOSSEN"
echo ""
echo "Wenn nichts gefunden wurde, bedeutet das:"
echo "  1. Account wurde NICHT von dieser VM erstellt"
echo "  2. Logs wurden gelöscht/rotiert"
echo "  3. Account wurde von anderem Gerät aus erstellt"
echo ""
echo "Empfohlene nächste Schritte:"
echo "  - Prüfe auf deinem Windows-Laptop (PowerShell Script)"
echo "  - Frage direkt auf MoltCities nach: Wer hat Rook erstellt?"
echo "============================================"
