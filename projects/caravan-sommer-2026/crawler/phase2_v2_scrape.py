#!/usr/bin/env python3
"""
phase2_v2_scrape.py — Phase-2-Crawler v2 für Caravan-Sommer-2026.

Quellen:
  - netzwerk-oekodorf.de → DEAD (NXDOMAIN, kein Wayback)
    → dokumentiert, ersetzt durch gen-deutschland.de (gleicher DACH-Fokus,
      moderne Nachfolgeorganisation "Global Ecovillage Network")
  - wohnprojekte-portal.de → inline data-map-data JSON, ~771 Einträge
  - squat.net → Blog-Artikel via de.squat.net/tag/wagenplatz/ etc.,
                DE/DACH-Filter (keine Athen/Gent/Belgien-Artikel)

Output: JSONL, eine Zeile pro Initiative
  - gen-deutschland:    <workspace>/datenbank/initiative-archiv/netzwerk-oekodorf/netzwerk-oekodorf_initiativen.jsonl
  - wohnprojekte-portal:<workspace>/datenbank/initiative-archiv/wohnprojekte-portal/wohnprojekte-portal_initiativen.jsonl
  - squat.net:          <workspace>/datenbank/initiative-archiv/squat-net/squat-net_initiativen.jsonl

Schema: datenbank/initiative-archiv/SCHEMA.md
"""

import argparse
import asyncio
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

WORKSPACE = Path("/root/.openclaw/workspace")
ARCHIVE_ROOT = WORKSPACE / "projects/caravan-sommer-2026/datenbank/initiative-archiv"

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


# =====================================================================
# Helpers
# =====================================================================

def write_jsonl(records: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def scraped_at() -> str:
    return datetime.now(timezone.utc).isoformat()


# =====================================================================
# netzwerk-oekodorf.de → GEN DEUTSCHLAND (Substitut)
# =====================================================================

def normalize_gen_character(project_text: str, name: str) -> str:
    """Heuristik: 'spirituell', 'basisdemokratisch', etc.
    Reihenfolge wichtig: spezifischer vor generischer.
    """
    combined = (name + " " + project_text).lower()
    if any(k in combined for k in ["anthroposoph", "waldorf", "rudolf steiner", "goetheanum"]):
        return "anthroposophisch"
    if any(k in combined for k in ["christlich", "orden", "kloster"]):
        return "christlich-spirituell"
    # Spirituell: nur explizite Marker, mit Wortgrenzen wenn möglich
    spiritual_markers = [
        "spirituell", "meditationspraxis", "meditationszentrum",
        "yoga", "achtsamkeitspraxis", "achtsamkeit", "ritualarbeit",
        "schamanisch", "schamanische",
    ]
    if any(k in combined for k in spiritual_markers):
        return "spirituell"
    # "meditation", "ritual" alleine (ohne -arbeit/-praxis) — nur wenn im Kontext mit "Praxis/Zentrum/Gruppe"
    if "meditation" in combined and any(ctx in combined for ctx in ["meditations", "meditationsgruppe", "meditationsraum"]):
        return "spirituell"
    if "ritual" in combined and any(ctx in combined for ctx in ["ritualarbeit", "rituale", "ritualraum"]):
        return "spirituell"
    if any(k in combined for k in ["basisdemokratisch", "konsens", "soziokratie"]):
        return "basisdemokratisch"
    if "permacultur" in combined or "permaculture" in combined:
        return "ökologisch"
    if any(k in combined for k in ["ökodorf", "ecovillage", "gemeinschaft"]):
        return "ökologisch-gemeinschaftlich"
    return "ökologisch"


def extract_gen_project_page(html: str, url: str, slug: str) -> dict | None:
    """Extrahiert aus einer GEN-Projektseite."""
    soup = BeautifulSoup(html, "html.parser")

    # Suche den richtigen Titel: nicht "About Me" (Divi-Theme Default)
    name = slug
    for h1 in soup.find_all("h1"):
        candidate = h1.get_text(strip=True)
        if candidate and candidate.lower() not in ("about me", "über mich", "startseite"):
            name = candidate
            break
    # og:title als Fallback (oft sauberer als H1)
    og_title = soup.find("meta", attrs={"property": "og:title"})
    if og_title and og_title.get("content"):
        og_name = og_title["content"].split(" - ")[0].split(" – ")[0].strip()
        if og_name and og_name.lower() not in ("about me", "über mich"):
            name = og_name
    # Falls Titel noch Suffix hat
    name = re.sub(r"\s*[-–—]\s*GEN Deutschland.*$", "", name, flags=re.IGNORECASE)
    if not name or name.lower() == "about me":
        # Letzter Fallback: slug humanisieren
        name = slug.replace("-", " ").title()

    # Meta description als Fallback
    desc_meta = soup.find("meta", attrs={"name": "description"})
    description = desc_meta.get("content", "") if desc_meta else ""

    # Body-Text (alles in main content)
    main = soup.find("main") or soup.find("article") or soup
    text = main.get_text("\n", strip=True)
    # "About Me" Prefix entfernen (Divi-Theme Default-Modul)
    text = re.sub(r"^About\s*Me\s*\n*", "", text, flags=re.IGNORECASE).strip()

    # Email: nur aus article/main, projektspezifisch (nicht info@gen-deutschland.de)
    contact_email = None
    main_text = main.get_text(" ", strip=True) if main else ""
    email_matches = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", main_text)
    gen_generic = {
        "info@gen-deutschland.de", "webmaster@gen-deutschland.de",
        "datenschutz@gen-deutschland.de", "dpo-google@google.com",
        "datenschutz@devowl.io", "support@realcookiebanner.com",
        "noreply@google.com", "noreply@googleusercontent.com",
    }
    project_emails = [e for e in email_matches if e.lower() not in gen_generic]
    if project_emails:
        contact_email = project_emails[0]
    else:
        # Fallback: "E-Mail: xxx@yyy.zz" Pattern im Text
        m = re.search(r"(?:E-?Mail|Kontakt|Mail)\s*[:\-]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", text)
        if m:
            contact_email = m.group(1)

    # Website: nur aus hrefs in <article>, nicht aus scripts/cookie-banner
    contact_url = None
    if main:
        for a in main.find_all("a", href=True):
            href = a["href"]
            if not href.startswith(("http://", "https://")):
                continue
            if any(blocked in href for blocked in [
                "gen-deutschland.de", "youtube.com", "youtu.be", "vimeo.com",
                "facebook.com", "twitter.com", "instagram.com", "linkedin.com",
                "google.com", "googleapis.com", "gstatic.com",
                "w3.org", "schema.org", "devowl.io", "realcookiebanner",
                "yoast.com", "yoast", "doubleclick.net", "unsplash.com",
                "unsplash.it", "etsystatic.com", "amazonaws.com",
            ]):
                continue
            contact_url = href
            break
    if not contact_url:
        og_url = soup.find("meta", attrs={"property": "og:url"})
        contact_url = og_url.get("content", url) if og_url else url

    phone_match = re.search(r"(\+?49[\s\-]?\d{2,4}[\s\-]?\d{3,}[\s\-]?\d{3,})", text)
    contact_phone = phone_match.group(1).strip() if phone_match else None

    # Adresse extrahieren (typischerweise "PLZ ORT" oder Straße+Ort)
    # Suche im article oder main nach <address> oder typischen Mustern
    address = None
    city = None
    plz = None
    region = None

    addr_el = soup.find("address")
    if addr_el:
        address = addr_el.get_text(" ", strip=True)
    else:
        # Suche typische PLZ+Ort
        plz_ort = re.search(r"\b(\d{5})\s+([A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][a-zäöüß\-]+)?)", text)
        if plz_ort:
            plz = plz_ort.group(1)
            city = plz_ort.group(2)
            address = f"{plz} {city}"

    # Region (Bundesland) grob aus Städtenamen
    region_map = {
        "Sachsen-Anhalt": ["Beetzendorf", "Steyerberg", "Poppau"],
        "Bayern": ["München", "Nürnberg", "Sulzbrunn", "Bierenbach", "Haslachhof", "Windberg"],
        "Baden-Württemberg": ["Stuttgart", "Freiburg", "Fuchsmühle"],
        "Hessen": ["Frankfurt", "Kassel", "Marburg", "Jahnishausen"],
        "Niedersachsen": ["Steyerberg", "Cobstädt", "Lübnitz", "Sonnenwald"],
        "Nordrhein-Westfalen": ["Köln", "Düsseldorf"],
        "Brandenburg": ["Berlin", "Schloss", "Tempelhof", "Blumental"],
        "Sachsen": ["Jahnishausen", "Dresden", "Leipzig"],
        "Thüringen": ["Erfurt", "Jena"],
        "Schleswig-Holstein": ["Kiel", "Lübeck"],
    }
    if city:
        for r, cities in region_map.items():
            if any(c.lower() in city.lower() for c in cities):
                region = r
                break
    if not region and address:
        for r, cities in region_map.items():
            if any(c.lower() in address.lower() for c in cities):
                region = r
                break

    country = "DE"

    # Description: kürze auf 1-5 Sätze, "About Me" Prefix raus
    desc_short = text[:800] if text else description
    desc_short = re.sub(r"^About\s*Me\s*\n*", "", desc_short, flags=re.IGNORECASE).strip()
    if description and len(description) > 100 and len(description) < len(desc_short):
        desc_short = description
    if len(desc_short) > 800:
        desc_short = desc_short[:800] + "..."

    return {
        "name": name,
        "type": "Ökodorf/Gemeinschaft",
        "types": ["Ökodorf"],
        "location": {
            "region": region,
            "city": city,
            "address": address,
            "country": country,
        },
        "contact_url": contact_url,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "character": normalize_gen_character(text, name),
        "cost": None,
        "activities": [],
        "description": desc_short,
        "issue_ref": None,
        "event_date": None,
        "source": "netzwerk-oekodorf.de (via gen-deutschland.de)",
        "source_url": url,
        "scraped_at": scraped_at(),
    }


async def crawl_gen_deutschland() -> dict:
    """Crawlt gen-deutschland.de/gemeinschaften/ + alle Projekt-Detailseiten."""
    output_dir = ARCHIVE_ROOT / "netzwerk-oekodorf"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "netzwerk-oekodorf_initiativen.jsonl"
    summary_file = output_dir / "netzwerk-oekodorf_last_run.json"

    print("🔍 netzwerk-oekodorf.de (= gen-deutschland.de)")
    print("   Status: netzwerk-oekodorf.de Domain TOT (NXDOMAIN)")
    print("   Substitut: gen-deutschland.de/gemeinschaften/")

    # /gemeinschaften/ = echte Communities (Sieben Linden, ZEGG, etc.)
    # /eigene-projekte/ = GEN-Programme (EDE, NextGEN, etc.) → ausgeschlossen
    # /abgeschlossene-projekte/ = vergangene GEN-Programme → ausgeschlossen
    list_urls = [
        "https://gen-deutschland.de/gemeinschaften/",
    ]

    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        all_project_links = set()
        for list_url in list_urls:
            r = await client.get(list_url)
            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "/projekt/" in href and href not in all_project_links:
                    # Filter Drafts
                    if "automatisch-gespeicherter" not in href:
                        all_project_links.add(href)

        print(f"   Gefunden: {len(all_project_links)} Projektseiten")

        records = []
        for i, url in enumerate(sorted(all_project_links), 1):
            try:
                r = await client.get(url)
                if r.status_code != 200:
                    print(f"   ⚠️  [{i}/{len(all_project_links)}] HTTP {r.status_code} {url}")
                    continue
                slug = url.rstrip("/").split("/")[-1]
                rec = extract_gen_project_page(r.text, url, slug)
                if rec:
                    records.append(rec)
                    print(f"   ✅ [{i}/{len(all_project_links)}] {rec['name'][:50]}")
                else:
                    print(f"   ❌ [{i}/{len(all_project_links)}] parse fail: {url}")
            except Exception as e:
                print(f"   ❌ [{i}/{len(all_project_links)}] error: {e}")
            await asyncio.sleep(0.5)

    write_jsonl(records, output_file)
    summary = {
        "source": "netzwerk-oekodorf (via gen-deutschland.de)",
        "note": "netzwerk-oekodorf.de Domain DEAD (NXDOMAIN, kein Wayback). GEN Deutschland ist moderne Nachfolge.",
        "crawled_at": scraped_at(),
        "records_extracted": len(records),
        "output_file": str(output_file),
    }
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"   → {len(records)} Einträge geschrieben")
    return summary


# =====================================================================
# wohnprojekte-portal.de
# =====================================================================

PROJEKTART_MAP = {
    1: "Realisiertes Projekt",
    3: "Projektgruppe",
    4: "Projekt in Gründung",
    5: "Stadtquartier",
    6: "Immobilie",
    7: "Wohnwunsch",
}

# Char-Heuristiken für Wohnprojekte
def normalize_wohnen_character(name: str, slug: str, desc: str = "") -> str:
    combined = (name + " " + slug).lower()
    if "spirituell" in combined or "meditation" in combined:
        return "spirituell"
    if "ökologisch" in combined or "oekologisch" in combined or "ökodor" in combined:
        return "ökologisch"
    if "ökodor" in combined or "ecovillage" in combined:
        return "ökologisch"
    if "basisdemokratisch" in combined or "konsens" in combined:
        return "basisdemokratisch"
    if "anthroposoph" in combined or "waldorf" in combined or "rudolf steiner" in combined:
        return "anthroposophisch"
    if "mehrgenerationen" in combined:
        return "Mehrgenerationen"
    if "inter" in combined and "kulturell" in combined:
        return "interkulturell"
    if "pflege" in combined or "senior" in combined or "alter" in combined:
        return "sozial"
    if "kloster" in combined:
        return "christlich-spirituell"
    return "gemeinschaftlich"


def extract_wohnen_record(d: dict) -> dict:
    name = d.get("name", "").strip() or d.get("addressName", "unbekannt")
    slug = d.get("slug", "")
    projektart = d.get("projektartName") or PROJEKTART_MAP.get(d.get("projektart"), "Wohnprojekt")
    mitstreiter = d.get("mitstreiterGesucht", 0)

    # Address
    street = d.get("street", "") or None
    plz = d.get("plz", "") or None
    city = d.get("city", "") or None
    address = None
    if street and plz and city:
        address = f"{street}, {plz} {city}"
    elif plz and city:
        address = f"{plz} {city}"
    elif city:
        address = city
    elif street:
        address = street

    # Country / Region heuristics
    country = "DE"  # Wohnprojekte-Portal ist DE-only
    region = None
    if city:
        # Sehr grobe Region-Mapping (DACH-Städte)
        region_map = {
            "Bayern": ["München", "Nürnberg", "Augsburg", "Regensburg", "Würzburg", "Bamberg", "Erlangen", "Bayreuth", "Fürth", "Ingolstadt", "Rosenheim", "Landshut", "Passau", "Straubing"],
            "Baden-Württemberg": ["Stuttgart", "Karlsruhe", "Mannheim", "Freiburg", "Heidelberg", "Heilbronn", "Ulm", "Pforzheim", "Reutlingen", "Tübingen", "Villingen", "Konstanz", "Baden-Baden", "Gomadingen", "Furtwangen", "Sulz", "Berglen", "Rottweil", "Allendorf", "Bisingen", "Bottrop"],
            "Berlin": ["Berlin"],
            "Brandenburg": ["Potsdam", "Cottbus", "Brandenburg", "Frankfurt", "Eberswalde", "Zehdenick", "Neustadt", "Großmutz", "Gross Kreutz"],
            "Bremen": ["Bremen", "Bremerhaven"],
            "Hamburg": ["Hamburg"],
            "Hessen": ["Frankfurt", "Kassel", "Wiesbaden", "Darmstadt", "Marburg", "Gießen", "Offenbach", "Hanau", "Darmstadt", "Kaufungen", "Fulda", "Gladenbach", "Cölbe", "Biskirchen"],
            "Mecklenburg-Vorpommern": ["Rostock", "Schwerin", "Wismar", "Stralsund", "Greifswald", "Loddin", "Usedom"],
            "Niedersachsen": ["Hannover", "Braunschweig", "Oldenburg", "Osnabrück", "Göttingen", "Wolfsburg", "Salzgitter", "Hildesheim", "Wennigsen", "Wehrbleck", "Rotenburg", "Hilpoltstein", "Penig", "Viechtach"],
            "Nordrhein-Westfalen": ["Köln", "Düsseldorf", "Dortmund", "Essen", "Bonn", "Bochum", "Wuppertal", "Bielefeld", "Münster", "Mönchengladbach", "Gelsenkirchen", "Hennef", "Brühl", "Dormagen", "Oberhausen", "Bottrop", "Kornelimünster"],
            "Rheinland-Pfalz": ["Mainz", "Koblenz", "Trier", "Kaiserslautern", "Ludwigshafen", "Nierstein", "Allendorf", "Leun", "Stadtlauringen"],
            "Saarland": ["Saarbrücken"],
            "Sachsen": ["Dresden", "Leipzig", "Chemnitz", "Zwickau", "Görlitz", "Jahnishausen", "Steutz", "Pödelwitz", "Penig", "Groitzsch", "Dessau"],
            "Sachsen-Anhalt": ["Magdeburg", "Halle", "Dessau", "Halberstadt", "Wittenberg", "Quedlinburg"],
            "Schleswig-Holstein": ["Kiel", "Lübeck", "Flensburg", "Neumünster", "Norderstedt", "Elmshorn", "Pinneberg", "Oldenburg", "Ashausen", "Lebus"],
            "Thüringen": ["Erfurt", "Jena", "Gera", "Weimar", "Eisenach", "Suhl", "Meißner", "Homberg"],
            # Österreich
            "AT-Vorarlberg": ["Götzis"],
            "AT-Wien": ["Wien"],
            "AT-Oberösterreich": ["Linz"],
            "AT-Tirol": ["Innsbruck"],
        }
        for r, cities in region_map.items():
            if any(c.lower() in city.lower() for c in cities):
                region = r
                break

    # Website / Email / Phone
    contact_email = d.get("email") or None
    if contact_email == "":
        contact_email = None

    contact_phone_raw = d.get("phone", "") or ""
    # Phone hat oft "Tel.: " prefix
    contact_phone = None
    phone_clean = re.sub(r"^(Tel\.?|Telefon|Mobil|Handy|Fax):\s*", "", contact_phone_raw).strip()
    if phone_clean:
        contact_phone = phone_clean

    contact_url_raw = d.get("website", "") or None
    if contact_url_raw and not contact_url_raw.startswith(("http://", "https://")):
        contact_url_raw = "https://" + contact_url_raw
    contact_url = contact_url_raw

    # Type-Bucket
    types = [projektart]
    if mitstreiter:
        types.append("Mitstreiter*innen gesucht")

    # Description: baue aus Feldern
    desc_parts = []
    if projektart:
        desc_parts.append(f"Projektart: {projektart}")
    if mitstreiter:
        desc_parts.append("Mitstreiter*innen gesucht")
    if street:
        desc_parts.append(f"Adresse: {address}")
    if contact_email:
        desc_parts.append(f"Kontakt: {contact_email}")
    if contact_phone:
        desc_parts.append(f"Tel: {contact_phone}")
    if contact_url:
        desc_parts.append(f"Web: {contact_url}")
    description = " | ".join(desc_parts) if desc_parts else f"Wohnprojekt aus Wohnprojekte-Portal (slug: {slug})"

    # Source URL auf Detailseite
    detail_url = f"https://www.wohnprojekte-portal.de/wohnprojekte-entdecken/wohnprojekt/{slug}/"

    character = normalize_wohnen_character(name, slug)

    return {
        "name": name,
        "type": "Wohnprojekt",
        "types": types,
        "location": {
            "region": region,
            "city": city,
            "address": address,
            "country": country,
        },
        "contact_url": contact_url,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "character": character,
        "cost": None,
        "activities": [],
        "description": description,
        "issue_ref": None,
        "event_date": None,
        "source": "wohnprojekte-portal.de",
        "source_url": detail_url,
        "scraped_at": scraped_at(),
    }


async def crawl_wohnprojekte_portal() -> dict:
    output_dir = ARCHIVE_ROOT / "wohnprojekte-portal"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "wohnprojekte-portal_initiativen.jsonl"
    summary_file = output_dir / "wohnprojekte-portal_last_run.json"

    url = "https://www.wohnprojekte-portal.de/wohnprojekte-entdecken/"
    print(f"🔍 wohnprojekte-portal.de")
    print(f"   Fetch: {url}")

    async with httpx.AsyncClient(
        timeout=60.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        html = r.text

    # Parse data-map-data inline JSON
    m = re.search(r'data-map-data="(\[.*?\])"', html, re.DOTALL)
    if not m:
        print("   ❌ data-map-data nicht gefunden")
        return {"error": "no data-map-data", "source": "wohnprojekte-portal"}
    import html as htmlmod
    raw = htmlmod.unescape(m.group(1))
    data_list = json.loads(raw)
    print(f"   Gefunden: {len(data_list)} Wohnprojekte inline")

    records = [extract_wohnen_record(d) for d in data_list]
    write_jsonl(records, output_file)

    summary = {
        "source": "wohnprojekte-portal.de",
        "crawled_at": scraped_at(),
        "records_extracted": len(records),
        "output_file": str(output_file),
        "projektart_distribution": dict((d.get("projektartName") or "?", 0) for d in data_list),
    }
    from collections import Counter
    summary["projektart_distribution"] = dict(Counter(
        d.get("projektartName") or PROJEKTART_MAP.get(d.get("projektart"), "?") for d in data_list
    ).most_common())
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"   → {len(records)} Einträge geschrieben")
    return summary


# =====================================================================
# squat.net (de.squat.net)
# =====================================================================

# DACH-Filter: Behalte Artikel, deren Titel oder Text DE/DACH-Marker enthält
DACH_MARKERS = [
    "berlin", "hamburg", "münchen", "munchen", "köln", "koln", "leipzig", "dresden",
    "frankfurt", "stuttgart", "düsseldorf", "dusseldorf", "bremen", "hannover",
    "nürnberg", "nurnberg", "wuppertal", "bonn", "kassel", "marburg", "freiburg",
    "rostock", "mainz", "saarbrücken", "potsdam", "erfurt", "jena", "weimar",
    "tübingen", "tubingen", "reutlingen", "ulm", "augsburg", "regensburg",
    "karlsruhe", "mannheim", "heidelberg", "darmstadt", "göttingen", "gottingen",
    "osnabrück", "osnabruck", "oldenburg", "flensburg", "kiel", "lübeck",
    "kassel", "cottbus", "cottbus", "halle", "magdeburg", "schwerin",
    "rostock", "zwickau", "görlitz", "gorlitz", "cottbus", "cottbus",
    "wien", "graz", "innsbruck", "salzburg", "linz", "villach", "klagenfurt",
    "zürich", "zurich", "basel", "bern", "genf", "winterthur", "luzern",
    "st. gallen", "lugano", "biel", "thun", "sion", "solothurn",
    "deutschland", "germany", "österreich", "oesterreich", "austria",
    "schweiz", "switzerland", "schweiz", "wiener", "berliner", "münchner",
    "hamburger", "leipziger", "düsseldorfer", "stuttgarter",
    "wagenplatz", "hausprojekt", "hausbesetzung", "besetzung", "squat",
    "zwangsräumung", "zwangsraeumung", "liebig34", "kopi", "habersaath",
    "karl-helga", "karlhelga", "rigaer", "rigaer94", "rigaer 94",
    "gisi", "baracken", "schiller", "schöneberg", "schoeneberg",
    "kreuzberg", "friedrichshain", "prenzlauer", "neukölln", "neukoelln",
    "wedding", "moabit", "lichtenberg", "mitte",
]

# NON-DACH: Word-Boundary-Match (sonst triggert "gent" in "gegen"/"gentrifizierung")
NON_DACH_PATTERNS = [
    r"\bathens?\b", r"\bgreece\b", r"\bgriechenland\b", r"\bgriechisch",
    r"\bgent\b(?![a-zäöüß])",  # "gent" als Wort, nicht "gentrifizierung"
    r"\bbelgien\b", r"\bbelgium\b", r"\bbelgisch",
    r"\bpraha\b", r"\bprag\b", r"\bwarschau\b", r"\bwarsaw\b",
    r"\bbarcelona\b", r"\bmadrid\b", r"\bvalencia\b",
    r"\bparis\b", r"\blyon\b", r"\bmarseille\b", r"\bfrankreich\b",
    r"\blondon\b", r"\bmanchester\b", r"\buk\b", r"\bengland\b",
    r"\bnew york\b", r"\blos angeles\b", r"\busa\b",
    r"\bitalien\b", r"\bitaly\b", r"\bmailand\b", r"\bmilan\b",
    r"\bniederlande\b", r"\bamsterdam\b", r"\brotterdam\b",
    r"\bskandinavien\b", r"\bkopenhagen\b", r"\boslo\b",
    r"\btürkei\b", r"\bistanbul\b",
    r"\bungarn\b", r"\bbudapest\b",
    r"\bslowenien\b", r"\bslovenien\b",
    r"\btriest\b",
]


def is_dach_relevant(title: str, body: str) -> bool:
    """True wenn DACH-relevant, False wenn explizit non-DACH."""
    combined = (title + " " + body[:2000]).lower()
    # Wenn explizit non-DACH (Word-Boundary-Match, case-insensitive)
    has_non_dach = any(re.search(p, combined, re.IGNORECASE) for p in NON_DACH_PATTERNS)
    if has_non_dach:
        # ABER wenn DACH auch vorkommt (Word-Boundary), lass durch
        # DACH_MARKERS als Substring war fehlerhaft ("sion" in "patission")!
        dach_count = 0
        for m in DACH_MARKERS:
            if re.search(rf"\b{re.escape(m)}\b", combined):
                dach_count += 1
        if dach_count >= 1:
            return True
        return False
    # Wenn DACH-Marker da oder unbekannt
    return True


def extract_squat_article(html: str, url: str) -> dict | None:
    soup = BeautifulSoup(html, "html.parser")

    # Title: Reihenfolge der Suche
    title = ""
    # 1. <h2 class="contenttitle"> (squat.net theme)
    for h2 in soup.find_all("h2"):
        cls = h2.get("class", [])
        if any("contenttitle" in c.lower() or "post-title" in c.lower() or "entry-title" in c.lower() for c in cls):
            title = h2.get_text(strip=True)
            break
    # 2. h1.entry-title (Standard WP)
    if not title:
        for sel in [
            ("h1", "entry-title"),
            ("h1", "post-title"),
            ("h1", "page-title"),
            ("h2", "entry-title"),
        ]:
            el = soup.find(sel[0], class_=sel[1])
            if el:
                title = el.get_text(strip=True)
                break
    # 3. og:title
    if not title or title.lower() in ("[squat!net]", "squat!net"):
        og = soup.find("meta", attrs={"property": "og:title"})
        if og and og.get("content"):
            title = og["content"].split(" - ")[0].split(" – ")[0].strip()
    # 4. <title>-Tag (nur wenn KEIN [Squat!net])
    if not title or title.lower() in ("[squat!net]", "squat!net"):
        t = soup.find("title")
        if t:
            title_text = t.get_text(strip=True)
            # Vermeide Site-Name-only
            if title_text and title_text.lower() not in ("[squat!net]", "squat!net"):
                title = title_text
    # 5. URL-Slug als Fallback
    if not title or title.lower() in ("[squat!net]", "squat!net"):
        from urllib.parse import urlparse
        slug = urlparse(url).path.rstrip("/").split("/")[-1]
        title = slug.replace("-", " ")
    title = title.strip() or "unbenannt"

    # Article content
    article = soup.find("article") or soup.find("main") or soup
    text = article.get_text("\n", strip=True)

    # Tags
    tags = []
    tag_section = soup.find("div", class_=re.compile(r"tags|post-tags", re.I))
    if tag_section:
        for a in tag_section.find_all("a"):
            tags.append(a.get_text(strip=True))
    if not tags:
        # Fallback: tag-Rel-Links im Article
        for a in soup.find_all("a", rel="tag"):
            tags.append(a.get_text(strip=True))

    # Datum
    pub_date = None
    time_el = soup.find("time", attrs={"datetime": True})
    if time_el:
        pub_date = time_el.get("datetime")

    # Body ohne Header
    body_paragraphs = []
    if article:
        for p in article.find_all("p", recursive=True):
            ptxt = p.get_text(" ", strip=True)
            if ptxt and len(ptxt) > 30:
                body_paragraphs.append(ptxt)
    body = "\n\n".join(body_paragraphs)

    # Filter
    if not is_dach_relevant(title, body):
        return None

    # Initiative-Nennung (wie kontrapolis)
    initiative_keywords = [
        "wagenplatz", "hausprojekt", "ökodorf", "ecovillage", "kommune",
        "solawi", "solidarische landwirtschaft", "genossenschaft",
        "mietshäuser syndikat", "longo mai", "squat", "wwoof", "cooperative",
    ]
    body_lower = body.lower() + " " + title.lower()
    mentioned_initiatives = [k for k in initiative_keywords if k in body_lower]

    # Location-Detection
    location = {"region": None, "city": None, "address": None, "country": None}
    title_lower = title.lower()
    # Hauptstadt-Mapping
    city_country_map = {
        "berlin": ("Berlin", "DE"), "hamburg": ("Hamburg", "DE"),
        "leipzig": ("Sachsen", "DE"), "münchen": ("Bayern", "DE"),
        "munchen": ("Bayern", "DE"), "köln": ("Nordrhein-Westfalen", "DE"),
        "koln": ("Nordrhein-Westfalen", "DE"), "frankfurt": ("Hessen", "DE"),
        "stuttgart": ("Baden-Württemberg", "DE"), "dresden": ("Sachsen", "DE"),
        "bremen": ("Bremen", "DE"), "hannover": ("Niedersachsen", "DE"),
        "nürnberg": ("Bayern", "DE"), "nurnberg": ("Bayern", "DE"),
        "freiburg": ("Baden-Württemberg", "DE"), "kassel": ("Hessen", "DE"),
        "tübingen": ("Baden-Württemberg", "DE"), "tubingen": ("Baden-Württemberg", "DE"),
        "karlsruhe": ("Baden-Württemberg", "DE"), "augsburg": ("Bayern", "DE"),
        "innsbruck": ("Tirol", "AT"), "wien": ("Wien", "AT"),
        "zürich": ("Zürich", "CH"), "zurich": ("Zürich", "CH"),
        "basel": ("Basel-Stadt", "CH"), "winterthur": ("Zürich", "CH"),
        "solothurn": ("Solothurn", "CH"), "wagabunten": ("Solothurn", "CH"),
        "habersaath": ("Berlin", "DE"), "kopi": ("Berlin", "DE"),
        "liebig34": ("Berlin", "DE"), "rigaer": ("Berlin", "DE"),
        "habersaath46": ("Berlin", "DE"), "habersaathstraße": ("Berlin", "DE"),
        "der-palast": ("Innsbruck", "AT"), "palast": ("Innsbruck", "AT"),
    }
    for marker, (city, country) in city_country_map.items():
        if marker in title_lower:
            location["city"] = city
            location["country"] = country
            location["region"] = city if country == "DE" and len(city) < 20 else None
            if country == "DE":
                # Bundesland-Region
                region_de = {
                    "Berlin": "Berlin", "Hamburg": "Hamburg", "Bremen": "Bremen",
                    "Bayern": "Bayern", "Sachsen": "Sachsen", "Hessen": "Hessen",
                    "Baden-Württemberg": "Baden-Württemberg", "Niedersachsen": "Niedersachsen",
                    "Nordrhein-Westfalen": "Nordrhein-Westfalen",
                }
                location["region"] = region_de.get(city, location["region"])
            break

    # Wenn noch keine City erkannt: scan body
    if not location["city"]:
        # Suche erste DACH-Stadt im Body
        body_for_city = (title + " " + body[:2000]).lower()
        # Direkte Suche
        for marker, (city, country) in city_country_map.items():
            if marker in body_for_city:
                location["city"] = city
                location["country"] = country
                break
        # Fallback: erster "in ORT" pattern
        if not location["city"]:
            m = re.search(r"\b(?:in|aus|nach|bei|um)\s+([A-ZÄÖÜ][a-zäöüß\-]+(?:\s+[A-ZÄÖÜ][a-zäöüß\-]+)?)\b", body[:1500])
            if m:
                location["city"] = m.group(1)

    if not location["city"]:
        # Fallback: erstes deutsches/AT/CH Stadt im Body
        m = re.search(r"\b(?:in|aus|nach|bei|um)\s+([A-ZÄÖÜ][a-zäöüß\-]+(?:\s+[A-ZÄÖÜ][a-zäöüß\-]+)?)\b", body[:1500])
        if m:
            location["city"] = m.group(1)

    # Type/character
    character = "links/anarchistisch"
    if any(k in title_lower for k in ["wagenplatz", "wagenplätze"]):
        character = "links/anarchistisch (Wagenplatz)"
    elif any(k in title_lower for k in ["hausprojekt", "besetz", "squat"]):
        character = "links/anarchistisch (Hausprojekt/Squat)"

    # Type
    raw_type = "Squat.net-Artikel"
    if mentioned_initiatives:
        if "wagenplatz" in title_lower:
            raw_type = "Wagenplatz-Artikel"
        elif any(k in title_lower for k in ["hausprojekt", "besetz"]):
            raw_type = "Hausprojekt-Artikel"
        else:
            raw_type = "Squat-Artikel (initiativen-bezogen)"
    else:
        raw_type = "Squat-Artikel (thematisch)"

    return {
        "name": title,
        "type": raw_type,
        "types": mentioned_initiatives,
        "location": location,
        "contact_url": None,
        "contact_email": None,
        "contact_phone": None,
        "character": character,
        "cost": None,
        "activities": [],
        "description": body[:600],
        "issue_ref": None,
        "event_date": pub_date,
        "tags": tags,
        "mentioned_initiatives": mentioned_initiatives,
        "source": "squat.net",
        "source_url": url,
        "scraped_at": scraped_at(),
    }


async def crawl_squat_net() -> dict:
    output_dir = ARCHIVE_ROOT / "squat-net"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "squat-net_initiativen.jsonl"
    summary_file = output_dir / "squat-net_last_run.json"

    print(f"🔍 squat.net (de.squat.net)")

    # Tag-Archive + Suchseiten (DACH-relevant)
    list_pages = [
        "https://de.squat.net/tag/wagenplatz/",
        "https://de.squat.net/tag/hausprojekt/",
        "https://de.squat.net/tag/besetzung/",
        "https://de.squat.net/tag/deutschland/",
        "https://de.squat.net/tag/osterreich/",
        "https://de.squat.net/tag/schweiz/",
        "https://de.squat.net/tag/berlin/",
        "https://de.squat.net/tag/leipzig/",
        "https://de.squat.net/tag/hamburg/",
        "https://de.squat.net/tag/innsbruck/",
        "https://de.squat.net/tag/winterthur/",
        "https://de.squat.net/category/beitrag/",
        "https://de.squat.net/category/beitrag/page/2/",
        "https://de.squat.net/category/beitrag/page/3/",
        "https://de.squat.net/?s=hausprojekt",
        "https://de.squat.net/?s=wagenplatz",
    ]

    article_urls = set()
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        for list_url in list_pages:
            try:
                r = await client.get(list_url)
                if r.status_code != 200:
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    # Nur de.squat.net Artikel-URLs (YYYY/MM/DD/slug/)
                    if re.match(r"https://de\.squat\.net/\d{4}/\d{2}/\d{2}/[^/]+/?$", href):
                        article_urls.add(href.rstrip("/"))
                print(f"   • {list_url}: +{len([u for u in article_urls if True])} Artikel (running)")
            except Exception as e:
                print(f"   ⚠️  {list_url}: {e}")
            await asyncio.sleep(0.4)

    print(f"   Total unique Artikel-URLs: {len(article_urls)}")

    records = []
    skipped_non_dach = 0
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        for i, url in enumerate(sorted(article_urls), 1):
            try:
                r = await client.get(url)
                if r.status_code != 200:
                    continue
                rec = extract_squat_article(r.text, url)
                if rec is None:
                    skipped_non_dach += 1
                    continue
                records.append(rec)
                if i % 5 == 0 or i == len(article_urls):
                    print(f"   ✅ [{i}/{len(article_urls)}] {rec['name'][:55]}")
            except Exception as e:
                print(f"   ❌ [{i}] {url}: {e}")
            await asyncio.sleep(0.3)

    write_jsonl(records, output_file)
    summary = {
        "source": "squat.net",
        "crawled_at": scraped_at(),
        "article_urls_found": len(article_urls),
        "skipped_non_dach": skipped_non_dach,
        "records_extracted": len(records),
        "output_file": str(output_file),
    }
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"   → {len(records)} DE/DACH-Einträge geschrieben ({skipped_non_dach} non-DACH übersprungen)")
    return summary


# =====================================================================
# Main
# =====================================================================

async def main() -> None:
    parser = argparse.ArgumentParser(description="Caravan-Sommer-2026 Phase-2 v2 Crawler")
    parser.add_argument(
        "--source",
        choices=["netzwerk-oekodorf", "wohnprojekte", "squat-net", "all"],
        default="all",
    )
    args = parser.parse_args()

    start = time.time()
    results = {}

    if args.source in ("netzwerk-oekodorf", "all"):
        try:
            results["netzwerk-oekodorf"] = await crawl_gen_deutschland()
        except Exception as e:
            print(f"❌ netzwerk-oekodorf-Fehler: {e}", file=sys.stderr)
            results["netzwerk-oekodorf"] = {"error": str(e)}

    if args.source in ("wohnprojekte", "all"):
        try:
            results["wohnprojekte"] = await crawl_wohnprojekte_portal()
        except Exception as e:
            print(f"❌ wohnprojekte-Fehler: {e}", file=sys.stderr)
            results["wohnprojekte"] = {"error": str(e)}

    if args.source in ("squat-net", "all"):
        try:
            results["squat-net"] = await crawl_squat_net()
        except Exception as e:
            print(f"❌ squat-net-Fehler: {e}", file=sys.stderr)
            results["squat-net"] = {"error": str(e)}

    elapsed = time.time() - start
    print()
    print("=" * 60)
    print(f"✅ Fertig in {elapsed:.1f}s")
    for name, r in results.items():
        if "error" in r:
            print(f"   ❌ {name}: {r['error']}")
        else:
            print(f"   ✅ {name}: {r.get('records_extracted', 0)} Einträge → {r.get('output_file', '?')}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())