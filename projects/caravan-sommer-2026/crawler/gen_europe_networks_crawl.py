#!/usr/bin/env python3
"""
gen_europe_networks_crawl.py — Crawlt die 13 GEN-Europe nationalen Netzwerke.
Nicht die Einzel-Ökodörfer, aber die Netzwerke selbst sind nützliche Kontakte.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WORKSPACE = Path("/root/.openclaw/workspace")
ARCHIVE_ROOT = WORKSPACE / "projects/caravan-sommer-2026/datenbank/initiative-archiv"
OUTPUT_DIR = ARCHIVE_ROOT / "gen-europe-networks"
OUTPUT_FILE = OUTPUT_DIR / "gen_europe_networks.jsonl"
SUMMARY_FILE = OUTPUT_DIR / "gen_europe_last_run.json"

API_URL = "https://gen-europe.org/wp-json/wp/v2/geneunetworks?per_page=100"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def crawl():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT_FILE.exists():
        OUTPUT_FILE.unlink()

    resp = requests.get(API_URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    records = []
    for item in data:
        title = item.get("title", {}).get("rendered", "Unbekannt")
        link = item.get("link", "")
        content_html = item.get("content", {}).get("rendered", "")
        soup = BeautifulSoup(content_html, "html.parser")
        description = soup.get_text(separator=" ", strip=True)
        if len(description) > 800:
            description = description[:800] + "..."

        # Extract email from content
        email_match = __import__("re").compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").search(description)
        contact_email = email_match.group(0) if email_match else None

        # Extract URL from content
        url_match = __import__("re").compile(r"https?://[^\s\)\]<>\"]+").search(description)
        contact_url = url_match.group(0) if url_match else None

        # Determine country from title
        country_map = {
            "Ukraine": "UA", "Russia": "RU", "Sweden": "SE", "Finland": "FI",
            "Switzerland": "CH", "Belgium": "BE", "Netherlands": "NL", "Germany": "DE",
            "Italy": "IT", "Denmark": "DK", "France": "FR", "Spain": "ES",
            "Portugal": "PT", "Poland": "PL", "Greece": "GR", "Czech Republic": "CZ",
            "Hungary": "HU", "Austria": "AT", "Slovakia": "SK", "Slovenia": "SI",
            "Croatia": "HR", "Bosnia": "BA", "Serbia": "RS", "Montenegro": "ME",
            "North Macedonia": "MK", "Albania": "AL", "Romania": "RO", "Bulgaria": "BG",
            "Ireland": "IE", "United Kingdom": "GB", "Norway": "NO", "Iceland": "IS",
            "Estonia": "EE", "Latvia": "LV", "Lithuania": "LT", "Malta": "MT",
            "Cyprus": "CY", "Luxembourg": "LU", "Liechtenstein": "LI", "Monaco": "MC",
        }
        country = None
        for name, cc in country_map.items():
            if name in title:
                country = cc
                break

        record = {
            "name": title,
            "type": "Ökodorf-Netzwerk",
            "types": ["Ökodorf-Netzwerk", "GEN-Mitglied"],
            "location": {"region": None, "city": None, "address": None, "country": country},
            "contact_url": contact_url or link,
            "contact_email": contact_email,
            "contact_phone": None,
            "character": "basisdemokratisch",
            "cost": "tausch",
            "activities": ["Vernetzung", "Ökodörfer", "Bildung"],
            "description": description,
            "issue_ref": None,
            "event_date": None,
            "source": "gen-europe.org/geneunetworks",
            "source_url": link,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }
        records.append(record)
        with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    summary = {
        "source": "gen-europe-networks",
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "records_extracted": len(records),
        "output_file": str(OUTPUT_FILE),
    }
    SUMMARY_FILE.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"✅ {len(records)} GEN-Netzwerke → {OUTPUT_FILE}")


if __name__ == "__main__":
    crawl()
