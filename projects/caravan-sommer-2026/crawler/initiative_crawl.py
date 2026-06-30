#!/usr/bin/env python3
"""
initiative_crawl.py — Phase-2-Crawler für Caravan Sommer 2026 Initiativen-DB.

Quellen (erweiterbar):
  - contraste.org   (Kleinanzeigen + Termine, deutsch, anarchisch/basisdemokratisch,
                     AT/CH/DE-Schwerpunkt, KEIN Berlin-Bias)
  - kontrapolis.info (linke Berliner Online-Zeitung, thematische Artikel)

Output: JSONL, eine Zeile pro Initiative/Event.
  - contraste:    <workspace>/datenbank/initiative-archiv/contraste/contraste_initiativen.jsonl
  - kontrapolis:  <workspace>/datenbank/initiative-archiv/kontrapolis/kontrapolis_initiativen.jsonl

Schema: siehe datenbank/initiative-archiv/SCHEMA.md

Verwendung:
  source crawlee_venv/bin/activate
  python3 initiative_crawl.py --source contraste --max-requests 30
  python3 initiative_crawl.py --source kontrapolis --max-requests 60
  python3 initiative_crawl.py --source all
"""

import argparse
import asyncio
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from crawlee.crawlers import BeautifulSoupCrawler, BeautifulSoupCrawlingContext
from crawlee.http_clients import HttpxHttpClient
from crawlee import __version__ as crawlee_version

# --- Paths ---
WORKSPACE = Path("/root/.openclaw/workspace")
ARCHIVE_ROOT = WORKSPACE / "projects/caravan-sommer-2026/datenbank/initiative-archiv"

# --- Source config ---
SOURCES = {
    "contraste": {
        "start_urls": [
            "https://www.contraste.org/kleinanzeigen/",
            "https://www.contraste.org/termine/",
        ],
        "output_dir": ARCHIVE_ROOT / "contraste",
        "ssl_verify": True,  # contraste.org hat valides Zertifikat
        "crawl_subpages": False,
        "max_requests": 4,
    },
    "kontrapolis": {
        "start_urls": ["https://kontrapolis.info/"],
        "output_dir": ARCHIVE_ROOT / "kontrapolis",
        "ssl_verify": False,
        "crawl_subpages": True,
        "max_requests": 60,
    },
}

# Regex / Helpers
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
URL_RE = re.compile(r"https?://[^\s<>\"']+")
PHONE_DE_RE = re.compile(r"(\+?\d{1,3}[\s\-]?)?(\(?\d{2,5}\)?[\s\-]?)?\d{3,}[\s\-]?\d{3,}")


def is_article_url_kontrapolis(url: str) -> bool:
    """kontrapolis.info: Artikel-URLs = /NNNN/."""
    parsed = urlparse(url)
    return bool(re.search(r"/\d{4,}/?$", parsed.path))


# =====================================================================
# contraste.org extractors
# =====================================================================

def extract_contraste_kleinanzeigen(html: str, source_url: str) -> list[dict]:
    """Parse Kleinanzeigen-Seite: jede Anzeige = <h2> + 'CONTRASTE Nr. ...' meta + <p> body."""
    soup = BeautifulSoup(html, "html.parser")
    entry_content = soup.find("div", class_="entry-content")
    if not entry_content:
        return []

    # Filter-Liste: Headlines die KEINE Initiativen sind
    SKIP_TITLES = {
        "todesanzeige", "nachruf", "trauer", "gedenken", "wir trauern",
        "kleinanzeigen", "termine", "termine – contraste",
    }

    results = []
    children = list(entry_content.children)
    i = 0
    while i < len(children):
        node = children[i]
        if getattr(node, "name", None) == "h2":
            name = node.get_text(strip=True)
            if name.lower() in SKIP_TITLES:
                i += 1
                continue
            body_paragraphs = []
            j = i + 1
            issue_ref = None
            while j < len(children):
                nxt = children[j]
                if getattr(nxt, "name", None) == "h2":
                    break
                if getattr(nxt, "name", None) == "p":
                    text = nxt.get_text(" ", strip=True)
                    if not text:
                        j += 1
                        continue
                    m = re.match(r"^CONTRASTE\s+Nr\.\s+([\d\-]+)\s*\|\s*(.+)$", text)
                    if m:
                        issue_ref = f"CONTRASTE Nr. {m.group(1)}, {m.group(2).strip()}"
                    else:
                        body_paragraphs.append(text)
                j += 1

            body_text = "\n\n".join(body_paragraphs)
            record = build_contraste_record(
                name=name,
                body=body_text,
                issue_ref=issue_ref,
                source_url=source_url,
                source_kind="kleinanzeigen",
            )
            results.append(record)
            i = j
        else:
            i += 1
    return results


def extract_contraste_termine(html: str, source_url: str) -> list[dict]:
    """Parse Termine-Seite: jeder Event = <p> mit <strong> am Anfang."""
    soup = BeautifulSoup(html, "html.parser")
    entry_content = soup.find("div", class_="entry-content")
    if not entry_content:
        return []

    results = []
    for p in entry_content.find_all("p", recursive=True):
        strong = p.find("strong")
        if not strong:
            continue

        strong_text = strong.get_text(" ", strip=True)
        if not re.match(r"^[A-ZÄÖÜ][A-ZÄÖÜ\s\*\d\-\.]{2,}", strong_text):
            continue

        full_text = p.get_text("\n", strip=True)
        lines = [ln.strip() for ln in full_text.split("\n") if ln.strip()]
        if not lines:
            continue

        category = lines[0]
        title = category
        if len(lines) > 1 and len(lines[1]) < 80 and not re.search(r"\d{1,2}\.\s", lines[1]) and not lines[1].endswith(":"):
            title = lines[1]

        body = p.get_text(" ", strip=True)
        body_clean = body
        for prefix in [category, title]:
            if body_clean.startswith(prefix):
                body_clean = body_clean[len(prefix):].lstrip(" ,.-–—\n")
        body_clean = re.sub(r"\s+", " ", body_clean).strip()

        record = build_contraste_record(
            name=title,
            body=body_clean,
            issue_ref=None,
            source_url=source_url,
            source_kind="termine",
            event_category=category,
        )
        results.append(record)

    return results


def build_contraste_record(
    name: str,
    body: str,
    issue_ref: str | None,
    source_url: str,
    source_kind: str,
    event_category: str | None = None,
) -> dict:
    """Baut einen Schema-konformen Eintrag."""
    emails = list(set(EMAIL_RE.findall(body)))
    emails = [e for e in emails if not e.lower().endswith(("@contraste.org", "@example.com"))]
    contact_email = emails[0] if emails else None

    urls = []
    for m in URL_RE.finditer(body):
        u = m.group(0).rstrip(".,;:)")
        if "contraste.org" not in u:
            urls.append(u)
    clean_urls = [u for u in urls if not u.startswith("https://bit.ly")]
    contact_url = clean_urls[0] if clean_urls else (urls[0] if urls else None)

    phone_match = PHONE_DE_RE.search(body)
    contact_phone = phone_match.group(0).strip() if phone_match else None

    location = {"region": None, "city": None, "address": None, "country": None}

    def detect_country(addr: str) -> str | None:
        """Land aus PLZ oder Stadtnamen ableiten."""
        plz_match = re.match(r"\s*([A-Z])-?(\d{4,5})", addr)
        if plz_match:
            cc = plz_match.group(1)
            cc_map = {"A": "AT", "D": "DE", "F": "FR", "I": "IT", "CH": "CH"}
            return cc_map.get(cc, cc)
        at_cities = ["Wiener Neustadt", "Wien", "Klagenfurt", "Maria Elend",
                     "Eisenkappel", "Salzburg", "Wettmannstätten", "Steiermark",
                     "Kärnten", "Weststeiermark"]
        de_cities = ["Stuttgart", "Kassel", "Bad Belzig", "Brandenburg",
                     "Frankfurt", "Köln", "Hamburg", "Wittstock", "Großkneten",
                     "Berlin"]
        if any(c in addr for c in at_cities):
            return "AT"
        elif any(c in addr for c in de_cities):
            return "DE"
        return None

    def detect_region(addr: str) -> str | None:
        """Bundesland/Region aus Städtenamen ableiten (grobe Heuristik)."""
        region_map = {
            "Kärnten": ["Klagenfurt", "Maria Elend", "Eisenkappel", "Wettmannstätten"],
            "Steiermark": ["Steiermark", "Weststeiermark"],
            "Wien": ["Wien"],
            "Niederösterreich": ["Wiener Neustadt"],
            "Salzburg": ["Salzburg"],
            "Brandenburg": ["Bad Belzig", "Wittstock", "Brandenburg"],
            "Hessen": ["Frankfurt", "Kassel"],
            "Baden-Württemberg": ["Stuttgart"],
            "Nordrhein-Westfalen": ["Köln"],
            "Hamburg": ["Hamburg"],
            "Niedersachsen": ["Großkneten"],
            "Berlin": ["Berlin"],
        }
        for region, cities in region_map.items():
            if any(c in addr for c in cities):
                return region
        return None

    # 1) "Ort:" Format (typisch für Termine)
    ort_match = re.search(r"Ort:\s*([^.\n]+?)(?:\s+Info:|$)", body)
    if ort_match:
        addr = ort_match.group(1).strip().rstrip(",.;:")
        location["address"] = addr
        kl_city = re.search(r"\(([^)]+)\)", body)
        if kl_city:
            location["city"] = kl_city.group(1).strip()
        location["country"] = detect_country(addr)
        location["region"] = detect_region(addr)
    else:
        # 2) Inline PLZ + Ort Format (typisch für Kleinanzeigen)
        #    z.B. "9182 Maria Elend", "2700 Wiener Neustadt", "Klagenfurt/Celovec"
        #    Multi-word: PLZ gefolgt von 1–3 Worten (Title-Case), stoppt an Satzzeichen/Komma
        plz_ort = re.search(
            r"\b([A-Z]?-?\d{4,5})\s+"
            r"((?:[A-ZÄÖÜ][a-zäöüß\-]+/)?"
            r"(?:[A-ZÄÖÜ][a-zäöüß\-]+\s+){0,2}"
            r"[A-ZÄÖÜ][a-zäöüß\-]+)",
            body
        )
        if plz_ort:
            plz = plz_ort.group(1)
            city = plz_ort.group(2).strip().rstrip(".,;:")
            location["address"] = f"{plz} {city}"
            location["city"] = city
            location["country"] = detect_country(plz + " " + city)
            location["region"] = detect_region(city)
        else:
            # 3) Stadtnamen ohne PLZ
            for city in ["Maria Elend", "Klagenfurt", "Wiener Neustadt", "Stuttgart",
                         "Kassel", "Bad Belzig", "Frankfurt", "Köln", "Hamburg",
                         "Wittstock", "Großkneten", "Berlin", "Eisenkappel",
                         "Wettmannstätten", "Salzburg"]:
                if city in body:
                    location["city"] = city
                    location["country"] = detect_country(city)
                    location["region"] = detect_region(city)
                    location["address"] = city
                    break

    character = "anarchistisch/basisdemokratisch"

    raw_type = None
    body_lower = body.lower()
    name_lower = name.lower()
    combined = name_lower + " " + body_lower
    if event_category:
        combined += " " + event_category.lower()
    if any(k in combined for k in ["ökodorf", "ecovillage", "zegg"]):
        raw_type = "Ökodorf"
    elif any(k in combined for k in ["kommune", "interkomm", "lebensbogen", "gastwerke"]):
        raw_type = "Kommune"
    elif any(k in combined for k in ["solawi", "solidarische landwirtschaft"]):
        raw_type = "Solawi"
    elif any(k in combined for k in ["wwoof", "workaway", "volontariat", "freiwilligendienst", "fsj", "bundesfreiwilligendienst"]):
        raw_type = "Wwoofing-Hof"
    elif any(k in combined for k in ["repair-café", "repair-cafe", "repariercafé", "repariercafé"]):
        raw_type = "Repair-Café"
    elif any(k in combined for k in ["künstler", "kunst", "atelier", "galerie"]):
        raw_type = "Kunstprojekt"
    elif any(k in combined for k in ["gemeinschaftliches wohnen", "wohnprojekt", "zusammen leben"]):
        raw_type = "Wohnprojekt"
    elif any(k in combined for k in ["gedenk", "erinnerung", "vergangenheit", "kultur"]):
        raw_type = "Gedenkort/Veranstaltung"
    elif any(k in combined for k in ["camp", "sommercamp", "aktionstage"]):
        raw_type = "Camp/Aktion"
    elif "festival" in combined:
        raw_type = "Festival"
    elif any(k in combined for k in ["vortrag", "lesung", "diskussion", "workshop", "seminar", "tagung", "kongress", "symposium"]):
        raw_type = "Bildungsveranstaltung"
    elif any(k in combined for k in ["widerstand", "demonstration", "aktion"]):
        raw_type = "Aktion"
    elif any(k in combined for k in ["frauenhaus", "flinta", "feminist"]):
        raw_type = "Feministisches Projekt"
    elif any(k in combined for k in ["energiegenossenschaft", "solarverein", "photovoltaik-genossenschaft", "solarcamp", "energiecamp"]):
        raw_type = "Energieprojekt"
    elif any(k in combined for k in ["barriere", "inklusiv", "pfadfinder"]):
        raw_type = "Bildungs-/Sozialprojekt"
    else:
        raw_type = "Allgemein (Initiativen-Anzeige)" if source_kind == "kleinanzeigen" else "Veranstaltung"

    activities = []
    for k, label in [
        ("workshop", "Workshops"),
        ("konzert", "Konzerte"),
        ("kultur", "Kultur"),
        ("bildung", "Bildung"),
        ("garten", "Garten"),
        ("landwirtschaft", "Landwirtschaft"),
        ("reparieren", "Reparatur"),
        ("offenes treffen", "Offene Treffen"),
        ("mitmach", "Mitmach-Aktionen"),
        ("vernetzung", "Vernetzung"),
    ]:
        if k in body_lower:
            activities.append(label)

    cost = None
    if any(k in body_lower for k in ["kostenlos", "kostenfrei", "eintritt frei", "freiwillige spenden", "spende nach selbsteinschätzung", "umsonst"]):
        cost = "kostenlos/Spende"
    elif "spende" in body_lower:
        cost = "spendenbasis"

    return {
        "name": name,
        "type": raw_type,
        "types": [raw_type] if raw_type else [],
        "location": location,
        "contact_url": contact_url,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "character": character,
        "cost": cost,
        "activities": activities,
        "description": body[:800],
        "issue_ref": issue_ref,
        "event_date": None,
        "source": f"contraste.org/{source_kind}",
        "source_url": source_url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


# =====================================================================
# kontrapolis.info extractor
# =====================================================================

def extract_kontrapolis_article(html: str, source_url: str, aid: str | None) -> dict | None:
    soup = BeautifulSoup(html, "html.parser")

    best_div, best_count = None, 0
    for div in soup.find_all("div"):
        good_ps = [p for p in div.find_all("p", recursive=True)
                   if len(p.get_text(strip=True)) > 30]
        if len(good_ps) > best_count:
            best_count = len(good_ps)
            best_div = div

    text_parts = []
    if best_div:
        for p in best_div.find_all("p", recursive=True):
            txt = p.get_text(strip=True)
            if txt and len(txt) > 30:
                text_parts.append(txt)
    full_text = "\n\n".join(text_parts)

    categories = [
        c.get_text(strip=True)
        for c in soup.select(".cat-links a, .post-categories a, [rel='tag']")
        if c.get_text(strip=True)
    ]

    initiative_keywords = ["wagenplatz", "hausprojekt", "ökodor", "ecovillage", "kommune",
                           "solawi", "solidarische landwirtschaft", "genossenschaft",
                           "mietshäuser syndikat", "longo mai", "squat", "wwoof"]
    body_lower = full_text.lower()
    mentioned_initiatives = [k for k in initiative_keywords if k in body_lower]

    location = {"region": None, "city": None, "address": None, "country": None}
    city_match = re.search(r"\b(in|aus|nach|bei)\s+([A-ZÄÖÜ][a-zäöüß\-]+(?:\s+[a-zäöüß\-]+)?)\b", full_text)
    if city_match:
        location["city"] = city_match.group(2)

    return {
        "name": soup.title.string.strip() if soup.title else f"Artikel #{aid}",
        "type": "Kontrapolis-Artikel" + (" (initiativen-bezogen)" if mentioned_initiatives else " (thematisch)"),
        "types": categories if categories else [],
        "location": location,
        "contact_url": None,
        "contact_email": None,
        "contact_phone": None,
        "character": "linkspolitisch",
        "cost": None,
        "activities": [],
        "description": full_text[:600],
        "issue_ref": None,
        "event_date": None,
        "categories": categories,
        "mentioned_initiatives": mentioned_initiatives,
        "source": "kontrapolis.info",
        "source_url": source_url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


# =====================================================================
# Crawler main
# =====================================================================

async def crawl_contraste() -> None:
    cfg = SOURCES["contraste"]
    cfg["output_dir"].mkdir(parents=True, exist_ok=True)
    output_file = cfg["output_dir"] / "contraste_initiativen.jsonl"
    summary_file = cfg["output_dir"] / "contraste_last_run.json"

    if output_file.exists():
        output_file.unlink()

    http_client = HttpxHttpClient(verify=cfg["ssl_verify"])
    crawler = BeautifulSoupCrawler(
        http_client=http_client,
        max_requests_per_crawl=cfg["max_requests"],
    )

    total_records = 0

    @crawler.router.default_handler
    async def handler(ctx: BeautifulSoupCrawlingContext) -> None:
        nonlocal total_records
        url = ctx.request.url
        soup = ctx.soup
        raw_html = str(soup)

        if "/kleinanzeigen" in url:
            records = extract_contraste_kleinanzeigen(raw_html, url)
        elif "/termine" in url:
            records = extract_contraste_termine(raw_html, url)
        else:
            ctx.log.info(f"⚠️ Unbekannte Sub-URL: {url}")
            return

        with open(output_file, "a", encoding="utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                total_records += 1
        ctx.log.info(f"✅ {url}: {len(records)} Einträge extrahiert")

    print(f"🔍 contraste.org Crawl (Crawlee {crawlee_version})")
    print(f"   Start: {cfg['start_urls']}")
    print(f"   Output: {output_file}")
    print()
    await crawler.run(cfg["start_urls"])

    summary = {
        "source": "contraste",
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "requests_made": cfg["max_requests"],
        "records_extracted": total_records,
        "output_file": str(output_file),
    }
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print()
    print("=" * 50)
    print(f"✅ Fertig. {total_records} Einträge → {output_file}")
    print("=" * 50)


async def crawl_kontrapolis() -> None:
    cfg = SOURCES["kontrapolis"]
    cfg["output_dir"].mkdir(parents=True, exist_ok=True)
    output_file = cfg["output_dir"] / "kontrapolis_initiativen.jsonl"
    summary_file = cfg["output_dir"] / "kontrapolis_last_run.json"

    if output_file.exists():
        output_file.unlink()

    http_client = HttpxHttpClient(verify=cfg["ssl_verify"])
    crawler = BeautifulSoupCrawler(
        http_client=http_client,
        max_requests_per_crawl=cfg["max_requests"],
    )

    article_count = 0

    @crawler.router.default_handler
    async def request_handler(ctx: BeautifulSoupCrawlingContext) -> None:
        nonlocal article_count
        url = ctx.request.url
        soup = ctx.soup

        if is_article_url_kontrapolis(url):
            aid_match = re.search(r"/(\d+)/?$", urlparse(url).path)
            aid = aid_match.group(1) if aid_match else None

            record = extract_kontrapolis_article(str(soup), url, aid)
            if record:
                with open(output_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                article_count += 1
                ctx.log.info(f"📰 #{article_count}: {record['name'][:55]}")
        else:
            await ctx.enqueue_links(strategy="same-domain")

    print(f"🔍 kontrapolis.info Crawl (Crawlee {crawlee_version})")
    print(f"   Start: {cfg['start_urls'][0]}")
    print(f"   Limit: {cfg['max_requests']} Requests")
    print(f"   Output: {output_file}")
    print()
    await crawler.run(cfg["start_urls"])

    summary = {
        "source": "kontrapolis",
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "requests_made": cfg["max_requests"],
        "records_extracted": article_count,
        "output_file": str(output_file),
    }
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print()
    print("=" * 50)
    print(f"✅ Fertig. {article_count} Einträge → {output_file}")
    print("=" * 50)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Caravan-Sommer-2026 Initiative-Crawler")
    parser.add_argument("--source", choices=["contraste", "kontrapolis", "all"],
                        default="all", help="Welche Quelle crawlen")
    parser.add_argument("--max-requests", type=int, default=None,
                        help="Override für max_requests (pro Crawl)")
    args = parser.parse_args()

    if args.max_requests:
        for src in SOURCES.values():
            src["max_requests"] = args.max_requests

    if args.source in ("contraste", "all"):
        try:
            await crawl_contraste()
        except Exception as e:
            print(f"❌ contraste-Fehler: {e}", file=sys.stderr)
            raise
    if args.source in ("kontrapolis", "all"):
        try:
            await crawl_kontrapolis()
        except Exception as e:
            print(f"❌ kontrapolis-Fehler: {e}", file=sys.stderr)
            raise


if __name__ == "__main__":
    asyncio.run(main())