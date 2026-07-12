#!/usr/bin/env python3
"""
Adress-Anreicherungs-Pipeline für Caravan-Sommer-2026.
Liest: bucket_b_* + bucket_c_* (424 Einträge ohne Adresse)
Schreibt: initiativen-angereichert.jsonl (inkrementell, crashfest)

Strategie pro Eintrag (in dieser Reihenfolge):
1. URL in contact_url → web_fetch → Impressum/Contact parsen → Adresse
2. URL aus Email-Domain ableiten → web_fetch → parsen
3. Workaway-URL → web_fetch → Adresse aus Host-Profil
4. Telefonvorwahl → PLZ/Region ableiten (als Proxy für gar nichts)
5. web_search("[name] [city/region] adresse") → Adresse parsen

Output: JSONL mit {original_entry, enriched_location, source, method}
"""
import json
import re
import time
import sys
from pathlib import Path
from collections import defaultdict

OUTDIR = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup")

# --- Regex-Patterns zum Adress-Parsen ---
PLZ_RE = re.compile(r'\b(\d{4,5})\b')
STREET_RE = re.compile(r'\b([A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.?|weg|gasse|platz|allee|ring|damm|ufer|chaussee|hof|berg|park|feld|grund|berg|berg|brook|busch|tor|eck|lust|berg))\b', re.IGNORECASE)
HOUSE_NR_RE = re.compile(r'\b(\d+[a-z]?)\b')
IMPRESSUM_RE = re.compile(r'(?:Impressum|Kontakt|Anschrift|Anschrift|Address|Adresse)[:\s]+(.{10,200})', re.IGNORECASE)

def extract_domain_from_email(email: str) -> str | None:
    """email@domain.de → domain.de"""
    if '@' in email:
        return email.split('@')[1].strip().lower()
    return None

def build_url_from_email_domain(domain: str) -> str:
    """www.domain.de → https://www.domain.de"""
    d = domain.lower().strip()
    if not d.startswith(('http://', 'https://')):
        d = 'https://' + d
    return d

def parse_address_from_html(html: str) -> dict | None:
    """
    Versucht aus HTML-Text eine Adresse zu extrahieren.
    Return: {"address": "PLZ Ort, Straße 12", "city": "...", "country": "DE"} oder None
    """
    # PLZ + Ort
    plz_match = re.search(r'\b(\d{5})\s+([A-ZÄÖÜ][a-zäöüß\s\-]+?)(?:,|\n|<br)', html)
    if not plz_match:
        plz_match = re.search(r'\b(\d{4})\s+([A-ZÄÖÜ][a-zäöüß\s\-]+?)(?:,|\n|<br)', html)
    if plz_match:
        plz, city = plz_match.group(1), plz_match.group(2).strip()
        # Suche Straße + Hausnummer im Umkreis von ~200 Zeichen nach der PLZ
        window = html[max(0, plz_match.start()-50):plz_match.end()+200]
        street = re.search(r'([A-ZÄÖÜ][a-zäöüß\-]+(?:straße|str\.?|weg|gasse|platz|allee|ring|damm|ufer|chaussee|berg|park|feld|grund|brook|busch|tor|eck))', window, re.IGNORECASE)
        house = re.search(r'(\d+\s*[a-z]?(?:\s*[/\-]\s*\d+)?)', window)
        addr = f"{plz} {city}"
        if street and house:
            addr = f"{street.group(1)} {house.group(1)}, {plz} {city}"
        elif street:
            addr = f"{street.group(1)}, {plz} {city}"
        return {"address": addr, "city": city, "country": None}
    return None

def priority_key(entry: dict) -> tuple:
    """
    Niedrige Zahl = hohe Priorität (mehr Ressourcen verfügbar)
    """
    url = entry.get('contact_url') or ''
    desc = entry.get('description', '') or ''
    source = entry.get('_source_file', '')
    has_url = bool(url and 'workaway.info' not in url and url not in ('', 'None'))
    has_email_domain = False
    for email_match in re.findall(r'[\w\.\-+]+@(?:[\w\.\-+]+\.[a-z]{2,})', desc):
        dom = email_match.split('@')[1].lower()
        if dom not in ('gmail.com','web.de','posteo.de','t-online.de','yahoo.de','yahoo.com','gmx.de','hotmail.de','outlook.de','mailbox.org'):
            has_email_domain = True
            break
    has_phone = bool(re.search(r'\b\d{3,5}[-\s]\d{6,8}\b', desc))
    
    if has_url:
        if source == 'netzwerk-oekodorf': return (1, 0)  # höchste Priorität
        if source == 'wohnprojekte-portal': return (2, 0)
        return (3, 0)
    if has_email_domain:
        return (4, 0)
    if has_phone:
        return (5, 0)
    return (6, 0)  # nur Name + Region → lowest priority

def load_all_to_research():
    """Alle Einträge aus Bucket B und C laden, die keine volle Adresse haben."""
    entries = []
    for fname in ['bucket_b_ohne_mit_url.jsonl', 'bucket_c_ohne_ohne_url.jsonl']:
        fpath = OUTDIR / fname
        if not fpath.exists():
            continue
        with fpath.open() as f:
            for line in f:
                if line.strip():
                    e = json.loads(line)
                    addr = e.get('location', {}).get('address', '') or ''
                    if not addr or len(addr.strip()) < 5:
                        entries.append(e)
    # Sortiere nach Priorität
    entries.sort(key=priority_key)
    return entries

def email_domain_candidates(entry: dict) -> list:
    """Extrahiert brauchbare Email-Domains aus einem Eintrag."""
    domains = []
    desc = entry.get('description', '') or ''
    for email_match in re.findall(r'[\w\.\-+]+@(?:[\w\.\-+]+\.[a-z]{2,})', desc):
        dom = email_match.split('@')[1].lower()
        if dom not in ('gmail.com','web.de','posteo.de','t-online.de','yahoo.de','yahoo.com','gmx.de','hotmail.de','outlook.de','mailbox.org','googlemail.com','riseup.net','systemli.org'):
            domains.append(dom)
    return domains

if __name__ == "__main__":
    # Test: lade Einträge + zeige Top 10 Priorität
    entries = load_all_to_research()
    print(f"Zu recherchieren: {len(entries)} Einträge")
    print("\nTop 20 (höchste Priorität):")
    for i, e in enumerate(entries[:20]):
        domains = email_domain_candidates(e)
        url = e.get('contact_url') or ''
        src = e.get('_source_file')
        city = e.get('location', {}).get('city') or e.get('location', {}).get('region') or '?'
        print(f"  {i+1:2d}. [{src}] {e.get('name', '')[:50]}")
        print(f"       city={city}, url={url}, email_domains={domains[:2]}")
