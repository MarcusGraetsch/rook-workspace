#!/usr/bin/env python3
"""Parse ki-experimente-chronologie.md and distribute into 23 category files.

This script uses explicit section-to-category mapping rather than keyword matching.
"""

import re
import os
import subprocess

SOURCE_FILE = "/root/.openclaw/workspace/research/ki-experimente-chronologie.md"
OUTPUT_DIR = "/root/.openclaw/workspace/research/ki-chronologie"

# Explicit section mapping: section_title -> list of category keys
SECTION_MAP = {
    "1. Mythische Wurzeln (Antike–Mittelalter)": ["01-antike-bis-1900"],
    "2. Early Literary Works (H.G. Wells, Soviet SF, etc.)": ["05-kunst-kultur"],
    "3. Die Film-Geschichte (1924–2026)": ["05-kunst-kultur"],
    "4. Television Series (Significant AI Themes)": ["05-kunst-kultur"],
    "5. Cartoons & Comics": ["05-kunst-kultur"],
    "6. Die Musik (1950er–heute)": ["05-kunst-kultur"],
    "7. Die Spiele (1950er–heute)": ["07-games"],
    "8. Die akademische und theoretische Grundlage (Pre-1950s → 2020s)": ["08-philosophie", "06-theorie-kritik"],
    "9. Real-World AI Experiments & Projects (1966–2025)": ["04-2000-2026", "23-wissenschaft-forschung"],
    "10. AI in Art & Visual Culture": ["05-kunst-kultur"],
    "11. AI in Architecture & Design": ["18-mode-design"],
    "12. Military & Surveillance AI": ["19-militaer-sicherheit"],
    "13. Feminist & Critical Perspectives on AI": ["10-feminist-postkolonial"],
    "14. AI & Labor / Economics": ["11-arbeit-oekonomie"],
    "15. Weiterführende Quellen": ["15-vergessene-nischen"],
}

CATEGORIES = {
    "01-antike-bis-1900": {
        "title": "01 - Antike bis 1900 (Mythische Wurzeln, Automaten, Frühe Maschinen)",
    },
    "02-1900-1960": {
        "title": "02 - 1900–1960 (Kybernetik, Turing, Frühe Computer)",
    },
    "03-1960-2000": {
        "title": "03 - 1960–2000 (KI-Winter, Expertensysteme, Frühes Internet)",
    },
    "04-2000-2026": {
        "title": "04 - 2000–2026 (Deep Learning, Big Tech, Aktuelle KI)",
    },
    "05-kunst-kultur": {
        "title": "05 - Kunst & Kultur (Film, Musik, Literatur, Kunst)",
    },
    "06-theorie-kritik": {
        "title": "06 - Theorie & Kritik (Philosophie, Kritische Theorie, Posthumanismus)",
    },
    "07-games": {
        "title": "07 - Games (Videospiele, NPCs, Procedural Generation)",
    },
    "08-philosophie": {
        "title": "08 - Philosophie (Bewusstsein, Ethik, KI-Denken)",
    },
    "09-kritische-theorie": {
        "title": "09 - Kritische Theorie (Frankfurt School, Marxismus, KI-Kritik)",
    },
    "10-feminist-postkolonial": {
        "title": "10 - Feminist & Postkolonial (Gender, Rasse, Dekolonisierung)",
    },
    "11-arbeit-oekonomie": {
        "title": "11 - Arbeit & Ökonomie (Automation, UBI, Gig Economy)",
    },
    "12-recht-ethik": {
        "title": "12 - Recht & Ethik (AI Act, Copyright, Haftung)",
    },
    "13-klima-oekologie": {
        "title": "13 - Klima & Ökologie (Energie, Umwelt, Nachhaltigkeit)",
    },
    "14-bildung-gesundheit": {
        "title": "14 - Bildung & Gesundheit (EdTech, Medizin, Therapie)",
    },
    "15-vergessene-nischen": {
        "title": "15 - Vergessene Nischen (Unterrepräsentierte KI-Geschichten)",
    },
    "16-religion-spiritualitaet": {
        "title": "16 - Religion & Spiritualität (KI und Glaube, Transhumanismus)",
    },
    "17-sport-wettkampf": {
        "title": "17 - Sport & Wettkampf (AlphaGo, Training, Analyse)",
    },
    "18-mode-design": {
        "title": "18 - Mode & Design (Generative Mode, Algorithmisches Design)",
    },
    "19-militaer-sicherheit": {
        "title": "19 - Militär & Sicherheit (Autonome Waffen, Cyberwar)",
    },
    "20-politik-medien": {
        "title": "20 - Politik & Medien (Desinformation, Wahlmanipulation, Journalismus)",
    },
    "21-finanzen-wirtschaft": {
        "title": "21 - Finanzen & Wirtschaft (HFT, Krypto, Algorithmisches Trading)",
    },
    "22-international": {
        "title": "22 - International (China, EU, Global South)",
    },
    "23-wissenschaft-forschung": {
        "title": "23 - Wissenschaft & Forschung (Forschungs-KI, Open Science, Akademie)",
    }
}

def read_and_parse(filename):
    """Read the file and parse into sections with entries."""
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Split by top-level sections (## )
    parts = content.split("\n## ")
    
    sections = []
    for part in parts:
        if not part.strip():
            continue
        
        # Find section title (first line)
        lines = part.split("\n")
        section_title = lines[0].strip()
        section_content = "\n".join(lines[1:])
        
        # Parse entries within section (### )
        entries = []
        entry_parts = section_content.split("\n### ")
        
        for i, ep in enumerate(entry_parts):
            if not ep.strip():
                continue
            if i == 0:
                # This might be intro text before first ###
                entries.append(("intro", ep.strip()))
            else:
                entries.append(("entry", "### " + ep.strip()))
        
        sections.append((section_title, entries))
    
    return sections

def distribute_entries(sections, section_map, categories):
    """Distribute entries from sections into category buckets."""
    category_entries = {cat: [] for cat in categories}
    
    for section_title, entries in sections:
        target_cats = None
        
        # Find matching section mapping
        for map_title, cats in section_map.items():
            if map_title.lower() in section_title.lower() or section_title.lower() in map_title.lower():
                target_cats = cats
                break
        
        if target_cats is None:
            print(f"Warning: No mapping for section '{section_title}'")
            continue
        
        for entry_type, entry_text in entries:
            for cat in target_cats:
                category_entries[cat].append((entry_type, entry_text, section_title))
    
    return category_entries

def write_category_file(cat_key, cat_info, entries):
    """Write a single category file."""
    filename = os.path.join(OUTPUT_DIR, f"ki-chronologie-{cat_key}.md")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"# {cat_info['title']}\n\n")
        f.write(f"> Teil der KI-Chronologie-Sammlung\n")
        f.write(f"> Extrahiert aus: ki-experimente-chronologie.md (134KB, 2630 Zeilen)\n")
        f.write(f"> Generiert: 2026-06-08\n\n")
        
        current_section = None
        for entry_type, entry_text, section_title in entries:
            if entry_type == "intro":
                f.write(f"{entry_text}\n\n")
            elif entry_type == "entry":
                f.write(f"{entry_text}\n\n")
    
    return filename

def count_entries(filename):
    """Count entries in a file."""
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Count ### entries
    entries = re.findall(r'\n### ', content)
    return len(entries)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    sections = read_and_parse(SOURCE_FILE)
    print(f"Parsed {len(sections)} sections")
    
    category_entries = distribute_entries(sections, SECTION_MAP, CATEGORIES)
    
    # Print statistics
    for cat, entries in category_entries.items():
        entry_count = sum(1 for e in entries if e[0] == "entry")
        print(f"{cat}: {entry_count} entries")
    
    # Write files
    written_files = []
    for cat_key, cat_info in CATEGORIES.items():
        entries = category_entries[cat_key]
        if entries:
            filename = write_category_file(cat_key, cat_info, entries)
            written_files.append(filename)
            entry_count = sum(1 for e in entries if e[0] == "entry")
            print(f"Written: {filename} ({entry_count} entries)")
    
    print(f"\nTotal files written: {len(written_files)}")

if __name__ == "__main__":
    main()
