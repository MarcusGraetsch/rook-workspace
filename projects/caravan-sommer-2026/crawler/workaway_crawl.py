#!/usr/bin/env python3
"""
workaway_crawl.py — Schneller Roh-Crawler für Workaway Host-Listings.
Scrapt /en/hostlist/europe (und Pages), extrahiert Host-Einträge.
Limit: max 200 Einträge, dann Abbruch (Volumen vor Vollständigkeit).
"""
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# --- Config ---
WORKSPACE = Path("/root/.openclaw/workspace")
ARCHIVE_ROOT = WORKSPACE / "projects/caravan-sommer-2026/datenbank/initiative-archiv"
OUTPUT_DIR = ARCHIVE_ROOT / "workaway"
OUTPUT_FILE = OUTPUT_DIR / "workaway_initiativen.jsonl"
SUMMARY_FILE = OUTPUT_DIR / "workaway_last_run.json"

BASE_URL = "https://www.workaway.info"
START_PATH = "/en/hostlist/europe"
MAX_RECORDS = 200
MAX_PAGES = 20  # Sicherheitslimit
REQUEST_DELAY = 1.5  # Sekunden zwischen Requests (höflich)

HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}

# Bekannte Kategorien (Workaway-Host-Typen)
KNOWN_CATEGORIES = {
    "Sustainable project", "Language exchange", "Cultural exchange",
    "Farm", "Family", "Community", "NGO", "Hostel", "Boat", "School",
    "House sitting", "Animal welfare", "Surfing", "Eco project",
    "Elderly care", "Art project", "DIY and building projects",
    "Help with Computers / Internet", "Charity work", "Teaching",
    "Babysitting and creative play", "Creating/ Cooking family meals",
    "Help around the house", "General Maintenance", "Gardening",
    "Help with Eco Projects", "Hospitality/Tourism", "Farming",
    "Photography", "Music", "Writing", "Sports", "Yoga",
}

# Länder die wir als DACH-relevant markieren
DACH_COUNTRIES = {"Germany", "Austria", "Switzerland"}
EUROPE_COUNTRIES = {
    "Germany", "Austria", "Switzerland", "France", "Italy", "Spain",
    "Portugal", "Netherlands", "Belgium", "Luxembourg", "Denmark",
    "Sweden", "Norway", "Finland", "Poland", "Czech Republic",
    "Slovakia", "Hungary", "Slovenia", "Croatia", "Bosnia and Herzegovina",
    "Serbia", "Montenegro", "North Macedonia", "Albania", "Greece",
    "Bulgaria", "Romania", "Moldova", "Ukraine", "Belarus",
    "Lithuania", "Latvia", "Estonia", "Russia", "Iceland",
    "Ireland", "United Kingdom", "Scotland", "Wales", "Northern Ireland",
    "Turkey", "Cyprus", "Malta", "Liechtenstein", "Monaco", "Andorra",
    "San Marino", "Vatican City", "Kosovo", "Georgia", "Armenia",
    "Azerbaijan",
}


def extract_host_entry(entry: BeautifulSoup) -> dict | None:
    """Parse ein einzelnes listentry-host div."""
    content = entry.find("div", class_="listentry-content")
    if not content:
        return None

    # Link und Host-ID
    link_a = content.find("a", href=re.compile(r"/en/host/\d+"))
    if not link_a:
        link_a = entry.find("a", href=re.compile(r"/en/host/\d+"))
    if not link_a:
        return None

    href = link_a.get("href", "")
    if not href.startswith("http"):
        href = BASE_URL + href

    host_id = re.search(r"/en/host/(\d+)", href)
    host_id = host_id.group(1) if host_id else None

    # Alle Textzeilen
    lines = [ln.strip() for ln in content.get_text(separator="\n").split("\n") if ln.strip()]
    if not lines:
        return None

    # Zeile 1: Land (meistens)
    country = lines[0] if lines[0] in EUROPE_COUNTRIES else None
    idx = 1 if country else 0

    # Kategorien: aufeinanderfolgende bekannte Kategorien
    categories = []
    while idx < len(lines) and lines[idx] in KNOWN_CATEGORIES:
        categories.append(lines[idx])
        idx += 1

    # Nächste Zeile = Titel
    title = lines[idx] if idx < len(lines) else "Unbekannt"
    idx += 1

    # Beschreibung: alle Zeilen bis zu einer, die nur Zahl, "Contact", Bewertung ist
    description_lines = []
    rating = None
    while idx < len(lines):
        line = lines[idx]
        if line in ("Contact", "1", "2", "3", "4", "5"):
            idx += 1
            continue
        if re.match(r"^\(\d+\)$", line):
            rating = line
            idx += 1
            continue
        if re.match(r"^\d+$", line) and len(line) <= 2:
            idx += 1
            continue
        description_lines.append(line)
        idx += 1

    description = " ".join(description_lines).strip()
    if len(description) > 800:
        description = description[:800] + "..."

    # Location-Mapping
    location = {"region": None, "city": None, "address": None, "country": None}
    if country:
        location["country"] = country
        # Versuche Stadt aus Titel zu extrahieren
        # z.B. "... in beautiful Caldana, Italy" oder "... in Apulia, Italy"
        city_match = re.search(r"in\s+([A-Z][a-zA-Z\s]+?),\s*" + re.escape(country), title)
        if city_match:
            location["city"] = city_match.group(1).strip()

    # Activities aus Kategorien ableiten
    activities = []
    for cat in categories:
        if cat in {"Sustainable project", "Eco project", "Help with Eco Projects"}:
            activities.append("Öko-Projekt")
        if cat in {"Farm", "Farming", "Gardening"}:
            activities.append("Farmarbeit")
        if cat in {"Language exchange", "Cultural exchange"}:
            activities.append("Sprach-/Kulturaustausch")
        if cat in {"Community"}:
            activities.append("Community-Leben")
        if cat in {"DIY and building projects", "General Maintenance"}:
            activities.append("Handwerk/Bauen")
        if cat in {"Art project", "Music", "Photography", "Writing"}:
            activities.append("Kunst/Kreativ")
        if cat in {"Teaching", "Babysitting and creative play"}:
            activities.append("Bildung/Betreuung")
        if cat in {"Yoga"}:
            activities.append("Yoga")
    activities = list(set(activities))

    # Cost: Workaway ist immer "kostenlos/tausch" (Unterkunft gegen Arbeit)
    cost = "tausch"

    # Character: pragmatisch/spirituell je nach Keywords
    character = "pragmatisch"
    desc_lower = description.lower()
    if any(k in desc_lower for k in ["spiritual", "meditation", "yoga", "mindfulness", "conscious", "holistic", "healing"]):
        character = "spirituell"
    elif any(k in desc_lower for k in ["community", "collective", "shared", "cooperative"]):
        character = "basisdemokratisch"

    return {
        "name": title,
        "type": "Workaway-Host",
        "types": ["Workaway-Host"] + categories,
        "location": location,
        "contact_url": href,
        "contact_email": None,
        "contact_phone": None,
        "character": character,
        "cost": cost,
        "activities": activities,
        "description": description,
        "issue_ref": None,
        "event_date": None,
        "source": "workaway.info",
        "source_url": href,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "_workaway_host_id": host_id,
        "_workaway_rating": rating,
        "_workaway_categories": categories,
    }


def crawl() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT_FILE.exists():
        OUTPUT_FILE.unlink()

    records = []
    page = 1

    while len(records) < MAX_RECORDS and page <= MAX_PAGES:
        url = f"{BASE_URL}{START_PATH}"
        if page > 1:
            url += f"?Page={page}"

        print(f"🔍 Page {page}: {url}")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
        except Exception as e:
            print(f"  ❌ Request-Fehler: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        entries = soup.find_all("div", class_=lambda x: x and "listentry" in x and "listentry-host" in x)
        print(f"  → {len(entries)} Einträge gefunden")

        if not entries:
            print("  → Keine Einträge mehr, Ende.")
            break

        for entry in entries:
            rec = extract_host_entry(entry)
            if rec:
                records.append(rec)
                with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                if len(records) >= MAX_RECORDS:
                    print(f"  → Max-Limit {MAX_RECORDS} erreicht, Abbruch.")
                    break

        # Check for next page link
        next_link = soup.find("a", rel="next")
        if not next_link:
            # Alternative: look for Page=N+1 in any link
            has_next = any(f"Page={page+1}" in a.get("href", "") for a in soup.find_all("a"))
            if not has_next:
                print("  → Keine weitere Seite, Ende.")
                break

        page += 1
        time.sleep(REQUEST_DELAY)

    summary = {
        "source": "workaway",
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "records_extracted": len(records),
        "output_file": str(OUTPUT_FILE),
        "pages_crawled": page - 1,
    }
    SUMMARY_FILE.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print()
    print("=" * 50)
    print(f"✅ Fertig. {len(records)} Einträge → {OUTPUT_FILE}")
    print("=" * 50)


if __name__ == "__main__":
    crawl()
