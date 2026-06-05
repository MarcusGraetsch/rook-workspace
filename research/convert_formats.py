#!/usr/bin/env python3
"""
Konvertiert verschiedene Formate in das Standard-Listen-Format.
"""

import re
import os

def convert_file_04(filename):
    """Konvertiert ki-chronologie-04-2000-2026.md (Film-Format)."""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Konvertiere ### Film (Jahr) — Regisseur
    # Zu: - **Jahr** — Film (Regisseur): Beschreibung
    
    lines = content.split('\n')
    result = []
    current_film = None
    current_year = None
    current_director = None
    current_desc = []
    
    for line in lines:
        # Neuer Film
        match = re.match(r'^###\s+(.+?)\s+\((\d{4})\)\s+—\s+(.+)$', line)
        if match:
            # Speichere vorherigen Film
            if current_film:
                desc = ' '.join(current_desc).strip()
                if desc:
                    result.append(f"- **{current_year}** — {current_film} ({current_director}): {desc}")
                else:
                    result.append(f"- **{current_year}** — {current_film} ({current_director})")
            
            current_film = match.group(1)
            current_year = match.group(2)
            current_director = match.group(3)
            current_desc = []
            continue
        
        # Bullet-Point Beschreibung
        if line.strip().startswith('- ') and current_film:
            desc = line.strip()[2:].strip()
            # Ignoriere "Quelle:" und "AI as..."
            if not desc.startswith('Quelle:') and not desc.startswith('**'):
                current_desc.append(desc)
        
        # Andere Zeilen
        result.append(line)
    
    # Speichere letzten Film
    if current_film:
        desc = ' '.join(current_desc).strip()
        if desc:
            result.append(f"- **{current_year}** — {current_film} ({current_director}): {desc}")
        else:
            result.append(f"- **{current_year}** — {current_film} ({current_director})")
    
    return '\n'.join(result)

def convert_file_14(filename):
    """Konvertiert ki-chronologie-14-bildung-gesundheit.md."""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Konvertiere #### Titel (Jahr–present) — Organisation
    # Zu: - **Jahr** — Titel (Organisation): Beschreibung
    
    lines = content.split('\n')
    result = []
    
    for line in lines:
        # Konvertiere #### Einträge
        match = re.match(r'^####\s+(.+?)\s+\((\d{4}).*?\)\s+—\s+(.+)$', line)
        if match:
            title = match.group(1)
            year = match.group(2)
            org = match.group(3)
            result.append(f"- **{year}** — {title} ({org})")
            continue
        
        # Konvertiere - **Titel** (Jahr) — Organisation
        match = re.match(r'^-\s+\*\*(.+?)\*\*\s+\((\d{4}).*?\)\s+—\s+(.+)$', line)
        if match:
            title = match.group(1)
            year = match.group(2)
            org = match.group(3)
            result.append(f"- **{year}** — {title} ({org})")
            continue
        
        result.append(line)
    
    return '\n'.join(result)

def convert_file_16(filename):
    """Konvertiert ki-chronologie-16-religion-spiritualitaet.md."""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Konvertiere ### Titel
    # - **Jahr:** Jahr–Jahr
    # - **Autor/Organisation:** Name
    # - **Beschreibung:** Text
    
    lines = content.split('\n')
    result = []
    current_title = None
    current_year = None
    current_org = None
    current_desc = []
    
    for line in lines:
        # Neuer Titel
        match = re.match(r'^###\s+(.+)$', line)
        if match:
            # Speichere vorherigen
            if current_title:
                desc = ' '.join(current_desc).strip()
                if desc:
                    result.append(f"- **{current_year}** — {current_title} ({current_org}): {desc}")
                else:
                    result.append(f"- **{current_year}** — {current_title} ({current_org})")
            
            current_title = match.group(1)
            current_year = None
            current_org = None
            current_desc = []
            continue
        
        # Jahr
        match = re.match(r'^-\s+\*\*Jahr:\*\*\s+(.+)$', line)
        if match:
            current_year = match.group(1)
            continue
        
        # Organisation
        match = re.match(r'^-\s+\*\*Autor/Organisation:\*\*\s+(.+)$', line)
        if match:
            current_org = match.group(1)
            continue
        
        # Beschreibung
        match = re.match(r'^-\s+\*\*Beschreibung:\*\*\s+(.+)$', line)
        if match:
            current_desc.append(match.group(1))
            continue
        
        # Quelle ignorieren
        if line.strip().startswith('- **Quelle:**'):
            continue
        
        result.append(line)
    
    # Speichere letzten
    if current_title:
        desc = ' '.join(current_desc).strip()
        if desc:
            result.append(f"- **{current_year}** — {current_title} ({current_org}): {desc}")
        else:
            result.append(f"- **{current_year}** — {current_title} ({current_org})")
    
    return '\n'.join(result)

def convert_file_28(filename):
    """Konvertiert ki-chronologie-28-sprache-linguistik.md."""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Konvertiere - **Name** — *Werk* (Jahr): Beschreibung
    # Zu: - **Jahr** — Name — *Werk*: Beschreibung
    
    lines = content.split('\n')
    result = []
    
    for line in lines:
        match = re.match(r'^-\s+\*\*(.+?)\*\*\s+—\s+\*(.+?)\*\s+\((\d{4})\):\s+(.+)$', line)
        if match:
            name = match.group(1)
            work = match.group(2)
            year = match.group(3)
            desc = match.group(4)
            result.append(f"- **{year}** — {name} — *{work}*: {desc}")
            continue
        
        result.append(line)
    
    return '\n'.join(result)

if __name__ == '__main__':
    conversions = {
        'ki-chronologie-04-2000-2026.md': convert_file_04,
        'ki-chronologie-14-bildung-gesundheit.md': convert_file_14,
        'ki-chronologie-16-religion-spiritualitaet.md': convert_file_16,
        'ki-chronologie-28-sprache-linguistik.md': convert_file_28,
    }
    
    for filename, converter in conversions.items():
        if os.path.exists(filename):
            print(f'Konvertiere {filename}...')
            converted = converter(filename)
            with open(filename, 'w') as f:
                f.write(converted)
            print(f'  Fertig.')
        else:
            print(f'{filename}: Nicht gefunden.')
    
    print('\n=== Konvertierung abgeschlossen ===')
