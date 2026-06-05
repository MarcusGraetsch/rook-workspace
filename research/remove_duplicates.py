#!/usr/bin/env python3
"""
Entfernt doppelte Einträge aus KI-Chronologie-Dateien.
"""

import os
import re

def remove_duplicates(filename):
    """Entfernt doppelte Einträge aus einer Datei."""
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    seen = set()
    unique_lines = []
    duplicates_removed = 0
    
    for line in lines:
        # Nur Listen-Einträge prüfen
        if line.strip().startswith('- **'):
            # Normalisiere für Vergleich
            normalized = line.strip().lower()
            # Entferne Jahre für Vergleich
            normalized = re.sub(r'^\- \*\*\d{4}.*?\*\* — ', '- **YEAR** — ', normalized)
            # Entferne Quellen in Klammern
            normalized = re.sub(r'\(.*?\)', '', normalized)
            # Entferne URLs
            normalized = re.sub(r'https?://\S+', '', normalized)
            normalized = normalized.strip()[:100]  # Erste 100 Zeichen
            
            if normalized in seen:
                duplicates_removed += 1
                continue
            seen.add(normalized)
        
        unique_lines.append(line)
    
    if duplicates_removed > 0:
        with open(filename, 'w') as f:
            f.writelines(unique_lines)
        return duplicates_removed
    return 0

if __name__ == '__main__':
    total_removed = 0
    for filename in sorted(os.listdir('.')):
        if filename.startswith('ki-chronologie-') and filename.endswith('.md') and filename != 'ki-chronologie-MASTER.md':
            removed = remove_duplicates(filename)
            if removed > 0:
                print(f'{filename}: {removed} Dubletten entfernt')
                total_removed += removed
    
    print(f'\n=== GESAMT: {total_removed} Dubletten entfernt ===')
