#!/bin/bash
# Google Drive Setup für aichitchatter@gmail.com
# Dieses Script führt dich Schritt für Schritt durch die OAuth-Einrichtung

echo "☁️  GOOGLE DRIVE BACKUP SETUP"
echo "=============================="
echo ""
echo "Für Account: aichitchatter@gmail.com"
echo ""

# Schritt 1: rclone config starten
echo "Schritt 1: rclone config wird gestartet..."
echo ""
echo "WICHTIG: Du musst Folgendes eingeben:"
echo ""
echo "Name: gdrive"
echo "Type: 13 (Google Drive)"
echo "Client ID: (einfach Enter drücken - Standard)"
echo "Client Secret: (einfach Enter drücken - Standard)"
echo "Scope: 1 (Full access)"
echo "Root Folder: (Enter)"
echo "Service Account: (Enter)"
echo "Edit advanced: n"
echo "Auto config: N (WICHTIG! Wir sind auf Server)"
echo ""
echo "Dann bekommst du einen LINK. Den öffnest du auf deinem Laptop."
echo ""
echo "Drücke Enter um rclone config zu starten..."
read

rclone config

echo ""
echo "=================================="
echo "Schritt 2: Nach der Konfiguration"
echo "=================================="
echo ""
echo "Wenn rclone fertig ist, teste mit:"
echo "  rclone listremotes"
echo ""
echo "Sollte zeigen: gdrive:"
echo ""
echo "Dann teste mit:"
echo "  rclone lsf gdrive:"
echo ""
echo "=================================="
echo "Schritt 3: Backup Script testen"
echo "=================================="
echo ""
echo "Führe aus:"
echo "  /root/.openclaw/workspace/backup_to_drive.sh"
