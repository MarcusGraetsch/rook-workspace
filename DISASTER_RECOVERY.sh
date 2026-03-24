#!/bin/bash
# DISASTER RECOVERY SCRIPT
# Wiederherstellung nach kompletter VM-Löschung
# Auszuführen auf neuer Ubuntu VM

set -e

echo "🚨 DISASTER RECOVERY - Digital Capitalism Research"
echo "=================================================="
echo ""
echo "Dieses Script wird ausgeführt auf einer FRISCHEN Ubuntu VM"
echo ""

# Konfiguration
REPO_URL="https://github.com/MarcusGraetsch/digital-capitalism-research.git"
BACKUP_USER="aichitchatter@gmail.com"
WORKSPACE_DIR="/root/.openclaw/workspace"

echo "📋 PHASE 1: System-Voraussetzungen"
echo "===================================="
echo ""

# 1.1 OS Updates
echo "[1.1] System-Updates..."
apt-get update -qq
apt-get install -y -qq git curl wget unzip sqlite3 python3 python3-pip nodejs npm

# 1.2 Wichtige Tools
echo "[1.2] Tools installieren..."
apt-get install -y -qq tmux htop vim

# 1.3 rclone für Google Drive
echo "[1.3] rclone installieren..."
curl https://rclone.org/install.sh | bash

echo ""
echo "📋 PHASE 2: OpenClaw Installation"
echo "===================================="
echo ""

# 2.1 OpenClaw installieren
echo "[2.1] OpenClaw wird installiert..."
echo "⚠️  MANUELL ERFORDERLICH:"
echo "   Folge der offiziellen OpenClaw Installationsanleitung"
echo "   https://docs.openclaw.ai/installation"
echo ""
echo "   ODER falls bekannt:"
echo "   curl -fsSL https://install.openclaw.ai | bash"
echo ""
read -p "Drücke ENTER wenn OpenClaw installiert ist..."

# 2.2 Kimi CLI
echo "[2.2] Kimi CLI installieren..."
npm install -g kimi-cli
echo "⚠️  MANUELL: kimi login (mit deinen Credentials)"
read -p "Drücke ENTER wenn Kimi CLI konfiguriert ist..."

# 2.3 OpenAI Codex
echo "[2.3] OpenAI Codex installieren..."
npm install -g @openai/codex
echo "⚠️  MANUELL: codex login (mit OpenAI Pro Account)"
read -p "Drücke ENTER wenn Codex konfiguriert ist..."

# 2.4 Anthropic Claude
echo "[2.4] Claude Code installieren..."
npm install -g @anthropic-ai/claude-code
echo "⚠️  MANUELL: claude auth (mit Anthropic Pro Account)"
read -p "Drücke ENTER wenn Claude konfiguriert ist..."

echo ""
echo "📋 PHASE 3: Workspace Wiederherstellung"
echo "=========================================="
echo ""

# 3.1 Haupt-Repository klonen
echo "[3.1] Haupt-Repository klonen..."
mkdir -p /root/.openclaw
cd /root/.openclaw
git clone "$REPO_URL" workspace
cd workspace

# 3.2 Andere Repositories klonen
echo "[3.2] Weitere Repositories..."
# Diese kommen aus der ROADMAP/TODO Liste
# Anpassen je nachdem was dokumentiert ist!

# Beispiele (anpassen an tatsächliche Repos):
# git clone https://github.com/MarcusGraetsch/marcus-cyborg.git
# git clone https://github.com/MarcusGraetsch/critical-theory-digital.git

echo "⚠️  INFO: Repositories werden aus backups/ oder manuell wiederhergestellt"
echo "   Siehe ROADMAP.md für vollständige Liste"

echo ""
echo "📋 PHASE 4: Konfigurationen Wiederherstellen"
echo "=============================================="
echo ""

# 4.1 rclone Config von Backup holen
echo "[4.1] rclone Konfiguration..."
echo "⚠️  MANUELL ERFORDERLICH:"
echo "   1. rclone config (wie beim ersten Setup)"
echo "   2. Mit aichitchatter@gmail.com authentifizieren"
echo ""
read -p "Drücke ENTER wenn rclone konfiguriert ist..."

# 4.2 .env Datei wiederherstellen
echo "[4.2] Umgebungsvariablen..."
if [ -f "$WORKSPACE_DIR/.env.template" ]; then
    cp "$WORKSPACE_DIR/.env.template" ~/.env
    echo "✅ .env.template kopiert nach ~/.env"
    echo "⚠️  MANUELL: API Keys eintragen!"
else
    echo "❌ Keine .env.template gefunden"
fi

# 4.3 Telegram Bot Config
echo "[4.3] Telegram Bot..."
echo "⚠️  MANUELL: Telegram Bot Token in .env eintragen"
echo "   TELEGRAM_TOKEN=..."
echo "   TELEGRAM_CHAT_ID=..."

echo ""
echo "📋 PHASE 5: Datenbanken Wiederherstellen"
echo "=========================================="
echo ""

# 5.1 Backup von Google Drive holen
echo "[5.1] Backups von Google Drive synchronisieren..."
mkdir -p "$WORKSPACE_DIR/backups"
rclone sync "gdrive:DigitalCapitalismBackups" "$WORKSPACE_DIR/backups" --progress

# 5.2 Datenbanken wiederherstellen
echo "[5.2] Datenbanken wiederherstellen..."
cd "$WORKSPACE_DIR"

# Finde neueste Backups
LATEST_ARTICLES=$(ls -t backups/articles_*.db 2>/dev/null | head -1)
LATEST_LITERATURE=$(ls -t backups/literature_*.db 2>/dev/null | head -1)
LATEST_PODCASTS=$(ls -t backups/podcasts_*.db 2>/dev/null | head -1)

if [ -n "$LATEST_ARTICLES" ]; then
    echo "   Restoring: $LATEST_ARTICLES"
    cp "$LATEST_ARTICLES" research/articles.db
else
    echo "   ⚠️  Kein articles Backup gefunden"
fi

if [ -n "$LATEST_LITERATURE" ]; then
    echo "   Restoring: $LATEST_ARTICLES"
    cp "$LATEST_LITERATURE" literature_pipeline/literature.db
else
    echo "   ⚠️  Kein literature Backup gefunden"
fi

echo ""
echo "📋 PHASE 6: Skills & Abhängigkeiten"
echo "====================================="
echo ""

# 6.1 Python Pakete
echo "[6.1] Python Abhängigkeiten..."
pip install -q spacy openpyxl requests beautifulsoup4
python3 -m spacy download en_core_web_sm

# 6.2 OpenClaw Skills
echo "[6.2] OpenClaw Skills installieren..."
echo "⚠️  MANUELL: Skills von ClawHub installieren"
echo "   Siehe TOOLS.md für Liste der benötigten Skills"
echo "   Beispiel: clawhub install skill-name"

echo ""
echo "📋 PHASE 7: Verifizierung"
echo "=========================="
echo ""

echo "[7.1] Tests durchführen..."

# Test 1: Datenbanken
if [ -f "research/articles.db" ]; then
    sqlite3 research/articles.db "SELECT COUNT(*) FROM articles;"
    echo "✅ articles.db OK"
else
    echo "❌ articles.db fehlt"
fi

# Test 2: Kimi
echo "2+2" | timeout 5 kimi >/dev/null 2>&1 && echo "✅ Kimi OK" || echo "❌ Kimi nicht bereit"

# Test 3: rclone
rclone about gdrive: >/dev/null 2>&1 && echo "✅ Google Drive OK" || echo "❌ Google Drive nicht verbunden"

echo ""
echo "=================================================="
echo "🎉 DISASTER RECOVERY ABGESCHLOSSEN!"
echo "=================================================="
echo ""
echo "Manuelle Schritte die noch nötig sind:"
echo "  ☐ OpenClaw vollständig konfigurieren"
echo "  ☐ Kimi login"
echo "  ☐ Codex login"
echo "  ☐ Claude auth"
echo "  ☐ rclone mit aichitchatter@gmail.com"
echo "  ☐ API Keys in ~/.env eintragen"
echo "  ☐ Telegram Bot konfigurieren"
echo "  ☐ Weitere Git Repositories klonen"
echo "  ☐ Skills installieren"
echo ""
echo "Dann kannst du mit mir über Telegram kommunizieren!"
echo ""
