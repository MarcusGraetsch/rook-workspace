#!/usr/bin/env python3
"""
Fügt automatisch Cross-Referenzen zu KI-Chronologie-Dateien hinzu.
"""

import os
import re

# Definiere thematische Verbindungen
cross_refs = {
    'ki-chronologie-01-antike-bis-1900.md': ['ki-chronologie-28-raumfahrt.md', 'ki-chronologie-15-vergessene-nischen.md'],
    'ki-chronologie-02-1900-1960.md': ['ki-chronologie-09-kritische-theorie.md', 'ki-chronologie-06-theorie-kritik.md'],
    'ki-chronologie-03-1960-2000.md': ['ki-chronologie-07-games.md', 'ki-chronologie-34-kommunikation.md'],
    'ki-chronologie-04-2000-2026.md': ['ki-chronologie-38-medizin.md', 'ki-chronologie-39-bildung.md', 'ki-chronologie-40-musik.md'],
    'ki-chronologie-05-kunst-kultur.md': ['ki-chronologie-40-musik.md', 'ki-chronologie-41-architektur.md', 'ki-chronologie-18-mode-design.md'],
    'ki-chronologie-06-theorie-kritik.md': ['ki-chronologie-09-kritische-theorie.md', 'ki-chronologie-10-feminist-postcolonial.md'],
    'ki-chronologie-07-games.md': ['ki-chronologie-42-sport.md', 'ki-chronologie-17-sport-spiele.md'],
    'ki-chronologie-08-philosophie.md': ['ki-chronologie-33-psychologie.md', 'ki-chronologie-06-theorie-kritik.md'],
    'ki-chronologie-09-kritische-theorie.md': ['ki-chronologie-10-feminist-postcolonial.md', 'ki-chronologie-43-global-south.md'],
    'ki-chronologie-11-arbeit-oekonomie.md': ['ki-chronologie-21-finanzen-wirtschaft.md', 'ki-chronologie-43-global-south.md'],
    'ki-chronologie-12-recht-ethik.md': ['ki-chronologie-29-recht.md', 'ki-chronologie-43-global-south.md'],
    'ki-chronologie-13-klima-oekologie.md': ['ki-chronologie-36-energie.md', 'ki-chronologie-41-architektur.md'],
    'ki-chronologie-14-bildung-gesundheit.md': ['ki-chronologie-38-medizin.md', 'ki-chronologie-39-bildung.md'],
    'ki-chronologie-16-religion-spiritualitaet.md': ['ki-chronologie-08-philosophie.md', 'ki-chronologie-06-theorie-kritik.md'],
    'ki-chronologie-17-sport-spiele.md': ['ki-chronologie-42-sport.md', 'ki-chronologie-07-games.md'],
    'ki-chronologie-18-mode-design.md': ['ki-chronologie-41-architektur.md', 'ki-chronologie-05-kunst-kultur.md'],
    'ki-chronologie-19-militaer-sicherheit.md': ['ki-chronologie-28-raumfahrt.md', 'ki-chronologie-43-global-south.md'],
    'ki-chronologie-21-finanzen-wirtschaft.md': ['ki-chronologie-11-arbeit-oekonomie.md', 'ki-chronologie-43-global-south.md'],
    'ki-chronologie-22-international.md': ['ki-chronologie-43-global-south.md', 'ki-chronologie-10-feminist-postcolonial.md'],
    'ki-chronologie-23-wissenschaft-forschung.md': ['ki-chronologie-38-medizin.md', 'ki-chronologie-24-grundlagen-mathematik.md'],
    'ki-chronologie-24-grundlagen-mathematik.md': ['ki-chronologie-27-grundlagen-informatik.md', 'ki-chronologie-25-grundlagen-physik.md'],
    'ki-chronologie-25-grundlagen-physik.md': ['ki-chronologie-24-grundlagen-mathematik.md', 'ki-chronologie-26-grundlagen-chemie.md'],
    'ki-chronologie-26-grundlagen-chemie.md': ['ki-chronologie-25-grundlagen-physik.md', 'ki-chronologie-38-medizin.md'],
    'ki-chronologie-27-grundlagen-informatik.md': ['ki-chronologie-24-grundlagen-mathematik.md', 'ki-chronologie-34-kommunikation.md'],
    'ki-chronologie-28-raumfahrt.md': ['ki-chronologie-19-militaer-sicherheit.md', 'ki-chronologie-25-grundlagen-physik.md'],
    'ki-chronologie-29-recht.md': ['ki-chronologie-12-recht-ethik.md', 'ki-chronologie-43-global-south.md'],
    'ki-chronologie-30-geschichte.md': ['ki-chronologie-09-kritische-theorie.md', 'ki-chronologie-06-theorie-kritik.md'],
    'ki-chronologie-31-anthropologie.md': ['ki-chronologie-32-soziologie.md', 'ki-chronologie-33-psychologie.md'],
    'ki-chronologie-32-soziologie.md': ['ki-chronologie-31-anthropologie.md', 'ki-chronologie-33-psychologie.md'],
    'ki-chronologie-33-psychologie.md': ['ki-chronologie-31-anthropologie.md', 'ki-chronologie-32-soziologie.md'],
    'ki-chronologie-34-kommunikation.md': ['ki-chronologie-27-grundlagen-informatik.md', 'ki-chronologie-40-musik.md'],
    'ki-chronologie-35-verkehr.md': ['ki-chronologie-36-energie.md', 'ki-chronologie-41-architektur.md'],
    'ki-chronologie-36-energie.md': ['ki-chronologie-35-verkehr.md', 'ki-chronologie-41-architektur.md'],
    'ki-chronologie-37-landwirtschaft.md': ['ki-chronologie-38-medizin.md', 'ki-chronologie-36-energie.md'],
    'ki-chronologie-38-medizin.md': ['ki-chronologie-33-psychologie.md', 'ki-chronologie-26-grundlagen-chemie.md'],
    'ki-chronologie-39-bildung.md': ['ki-chronologie-34-kommunikation.md', 'ki-chronologie-33-psychologie.md'],
    'ki-chronologie-40-musik.md': ['ki-chronologie-34-kommunikation.md', 'ki-chronologie-05-kunst-kultur.md'],
    'ki-chronologie-41-architektur.md': ['ki-chronologie-35-verkehr.md', 'ki-chronologie-36-energie.md'],
    'ki-chronologie-42-sport.md': ['ki-chronologie-33-psychologie.md', 'ki-chronologie-07-games.md'],
    'ki-chronologie-43-global-south.md': ['ki-chronologie-10-feminist-postcolonial.md', 'ki-chronologie-43-global-south.md'],
}

def add_cross_references(filename, targets):
    """Fügt Cross-Referenzen am Ende einer Datei hinzu."""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Prüfe, ob bereits Cross-Referenzen existieren
    if '→ Verweis:' in content:
        return 0  # Bereits vorhanden
    
    # Erstelle Cross-Referenzen-Block
    refs = []
    for target in targets:
        if target != filename and os.path.exists(target):  # Nicht auf sich selbst verweisen
            refs.append(f"→ Verweis: {target}")
    
    if not refs:
        return 0
    
    # Füge am Ende hinzu (vor dem letzten Absatz oder am Ende)
    cross_ref_block = "\n\n---\n\n**Cross-Referenzen:**\n" + "\n".join([f"- {ref}" for ref in refs])
    
    # Prüfe, ob Datei mit Quellen endet
    if 'Quellen' in content[-500:]:
        # Füge vor den Quellen hinzu
        content = content.rstrip() + cross_ref_block + "\n"
    else:
        # Füge am Ende hinzu
        content = content.rstrip() + cross_ref_block + "\n"
    
    with open(filename, 'w') as f:
        f.write(content)
    
    return len(refs)

if __name__ == '__main__':
    total_added = 0
    for filename, targets in cross_refs.items():
        if os.path.exists(filename):
            added = add_cross_references(filename, targets)
            if added > 0:
                print(f'{filename}: {added} Cross-Referenzen hinzugefügt')
                total_added += added
    
    print(f'\n=== GESAMT: {total_added} Cross-Referenzen hinzugefügt ===')
