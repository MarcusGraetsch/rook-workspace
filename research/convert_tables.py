#!/usr/bin/env python3
"""
Konvertiert Tabellen-Format in Listen-Format für KI-Chronologie-Dateien.
"""

import re
import sys

def convert_table_to_list(content):
    """Konvertiert Markdown-Tabellen in Listen-Format."""
    lines = content.split('\n')
    result = []
    in_table = False
    table_rows = []
    
    for line in lines:
        # Tabellen-Header erkennen
        if '|' in line and '---' in line:
            in_table = True
            continue
        
        # Tabellen-Zeile erkennen
        if in_table and '|' in line and not line.strip().startswith('#'):
            # Extrahiere Spalten
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            if len(cells) >= 4:
                year = cells[0]
                name = cells[1]
                org = cells[2]
                desc = cells[3]
                
                # Erstelle Listen-Eintrag
                if year and year != 'Jahr':
                    entry = f"- **{year}** — {name}: {desc}"
                    if org and org != 'Organisation':
                        entry += f" ({org})"
                    result.append(entry)
            continue
        
        # Tabellen-Ende
        if in_table and not line.strip().startswith('|'):
            in_table = False
        
        result.append(line)
    
    return '\n'.join(result)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 convert_tables.py <file>")
        sys.exit(1)
    
    filename = sys.argv[1]
    with open(filename, 'r') as f:
        content = f.read()
    
    converted = convert_table_to_list(content)
    
    with open(filename, 'w') as f:
        f.write(converted)
    
    print(f"Konvertiert: {filename}")
