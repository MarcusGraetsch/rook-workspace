#!/bin/bash
# Format-Korrektur für KI-Chronologie-Dateien
# Konvertiert **Format zu - **Format

for file in ki-chronologie-10-feminist-postcolonial.md ki-chronologie-15-vergessene-nischen.md ki-chronologie-20-politik-medien.md ki-chronologie-22-international.md ki-chronologie-26-grundlagen-chemie.md; do
    if [ -f "$file" ]; then
        echo "Korrigiere $file..."
        # Ersetze "**Text**" am Zeilenanfang durch "- **Text**"
        sed -i 's/^\*\*/- **/' "$file"
        echo "  Fertig."
    fi
done

echo "Alle Format-Korrekturen abgeschlossen."
