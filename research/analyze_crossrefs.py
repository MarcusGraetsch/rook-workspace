#!/usr/bin/env python3
"""
Analysiert Cross-Referenzen in KI-Chronologie-Dateien.
"""

import os
import re
from collections import defaultdict

def analyze_cross_references():
    """Analysiert alle Cross-Referenzen."""
    
    # Sammle alle Dateien
    files = {}
    for filename in sorted(os.listdir('.')):
        if filename.startswith('ki-chronologie-') and filename.endswith('.md') and filename != 'ki-chronologie-MASTER.md':
            files[filename] = True
    
    # Analysiere Verweise
    references = defaultdict(list)  # Ziel-Datei -> Liste von Quell-Dateien
    broken_refs = []  # Verweise auf nicht-existente Dateien
    
    for filename in files:
        with open(filename, 'r') as f:
            content = f.read()
        
        # Finde alle Verweise (verschiedene Formate)
        # Format 1: → Verweis: ki-chronologie-XX-name.md
        refs = re.findall(r'→ Verweis:\s*(ki-chronologie-[\w-]+\.md)', content)
        # Format 2: Verweis: ki-chronologie-XX-name.md (ohne Pfeil)
        refs2 = re.findall(r'Verweis:\s*(ki-chronologie-[\w-]+\.md)', content)
        # Format 3: ki-chronologie-XX-name.md in Klammern
        refs3 = re.findall(r'\(ki-chronologie-[\w-]+\.md\)', content)
        # Format 4: → Verweis: ki-chronologie-XX-name.md (mit Bindestrich)
        refs4 = re.findall(r'→ Verweis:\s*(ki-chronologie-[\w-]+\.md)', content)
        
        all_refs = refs + refs2 + refs3 + refs4
        for ref in all_refs:
            # Bereinige Referenz
            ref = ref.strip()
            references[ref].append(filename)
            if ref not in files:
                broken_refs.append((filename, ref))
    
    # Statistiken
    print("=== CROSS-REFERENZ ANALYSE ===\n")
    
    print(f"Gesamtdateien: {len(files)}")
    print(f"Dateien mit Verweisen: {len([f for f in files if references[f]])}")
    print(f"Dateien ohne Verweise: {len([f for f in files if not references[f]])}")
    print(f"Gesamt Verweise: {sum(len(refs) for refs in references.values())}")
    print(f"Gebrochene Verweise: {len(broken_refs)}")
    
    print("\n=== DATEIEN OHNE VERWEISE (isoliert) ===")
    isolated = [f for f in files if not references[f]]
    for f in isolated:
        print(f"  {f}")
    
    print("\n=== DATEIEN MIT DEN MEISTEN VERWEISEN (verbunden) ===")
    connected = sorted(references.items(), key=lambda x: len(x[1]), reverse=True)
    for target, sources in connected[:10]:
        print(f"  {target}: {len(sources)} Verweise")
    
    print("\n=== GEBROCHENE VERWEISE ===")
    for source, target in broken_refs:
        print(f"  {source} -> {target} (NICHT GEFUNDEN)")
    
    print("\n=== VERWEIS-STATISTIKEN PRO DATEI ===")
    for filename in sorted(files):
        refs_out = len(re.findall(r'→ Verweis:', open(filename).read()))
        refs_in = len(references.get(filename, []))
        print(f"  {filename}: {refs_out} ausgehend, {refs_in} eingehend")

if __name__ == '__main__':
    analyze_cross_references()
