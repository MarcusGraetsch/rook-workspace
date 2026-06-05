#!/usr/bin/env python3
"""
Dubletten-Prüfung für KI-Chronologie-Dateien.
"""

import os
import re
from collections import defaultdict

# Sammle alle Einträge
duplicates = defaultdict(list)

for filename in sorted(os.listdir('.')):
    if filename.startswith('ki-chronologie-') and filename.endswith('.md') and filename != 'ki-chronologie-MASTER.md':
        with open(filename, 'r') as f:
            content = f.read()
        
        # Extrahiere Einträge (Zeilen mit - **)
        entries = re.findall(r'^\- \*\*.*?\*\* — (.+?)$', content, re.MULTILINE)
        for entry in entries:
            # Normalisiere: entferne Jahreszahl und Quellen
            clean = re.sub(r'\(.*?\)', '', entry)  # Entferne Klammern
            clean = re.sub(r'https?://\S+', '', clean)  # Entferne URLs
            clean = clean.strip().lower()[:80]  # Kurze Version für Vergleich
            if clean:
                duplicates[clean].append(filename)

# Zeige Dubletten
print('=== DUBLETTEN-PRÜFUNG ===')
dup_count = 0
for entry, files in duplicates.items():
    if len(files) > 1:
        dup_count += 1
        print(f'\nDublette {dup_count}:')
        print(f'  Eintrag: {entry[:100]}...')
        print(f'  Dateien: {", ".join(files)}')

print(f'\n=== ZUSAMMENFASSUNG ===')
print(f'Gefundene Dubletten: {dup_count}')
print(f'Prüfung abgeschlossen.')
