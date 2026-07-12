#!/usr/bin/env python3
"""
Reverse-geocode alle Adressen im master_initiativen.jsonl via Nominatim.

- Max 1 req/sec (sleep 1.1s)
- 429 -> sleep 5s, retry once
- Fallback chain: full address -> city + country -> country -> null
- Skip entries that already have _lat/_lng (Workaway-vorhanden)
- Output: JSONL, UTF-8, ensure_ascii=False, atomar am Ende
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

INPUT = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup/master_initiativen.jsonl")
OUTPUT = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup/master_initiativen_geocoded.jsonl")
USER_AGENT = "CaravanSommer2026/1.0 (rook-agent)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Mapping fuer einheitliches Land-Lookup bei Fallbacks
COUNTRY_NAME = {
    "DE": "Germany", "AT": "Austria", "CH": "Switzerland", "FR": "France",
    "IT": "Italy", "ES": "Spain", "PT": "Portugal", "NL": "Netherlands",
    "BE": "Belgium", "LU": "Luxembourg", "DK": "Denmark", "SE": "Sweden",
    "NO": "Norway", "FI": "Finland", "IS": "Iceland", "IE": "Ireland",
    "GB": "United Kingdom", "UK": "United Kingdom", "PL": "Poland",
    "CZ": "Czechia", "SK": "Slovakia", "HU": "Hungary", "RO": "Romania",
    "BG": "Bulgaria", "GR": "Greece", "HR": "Croatia", "SI": "Slovenia",
    "RS": "Serbia", "BA": "Bosnia and Herzegovina", "AL": "Albania",
    "MK": "North Macedonia", "ME": "Montenegro", "MD": "Moldova",
    "UA": "Ukraine", "BY": "Belarus", "RU": "Russia", "EE": "Estonia",
    "LV": "Latvia", "LT": "Lithuania", "TR": "Turkey", "CY": "Cyprus",
    "MT": "Malta", "US": "United States", "CA": "Canada", "MX": "Mexico",
    "BR": "Brazil", "AR": "Argentina", "CL": "Chile", "CO": "Colombia",
    "PE": "Peru", "EC": "Ecuador", "BO": "Bolivia", "UY": "Uruguay",
    "PY": "Paraguay", "VE": "Venezuela", "CR": "Costa Rica",
    "GT": "Guatemala", "HN": "Honduras", "NI": "Nicaragua", "PA": "Panama",
    "CU": "Cuba", "DO": "Dominican Republic", "JM": "Jamaica",
    "AU": "Australia", "NZ": "New Zealand", "JP": "Japan", "KR": "South Korea",
    "CN": "China", "IN": "India", "ID": "Indonesia", "TH": "Thailand",
    "VN": "Vietnam", "PH": "Philippines", "MY": "Malaysia", "SG": "Singapore",
    "IL": "Israel", "PS": "Palestine", "LB": "Lebanon", "JO": "Jordan",
    "EG": "Egypt", "MA": "Morocco", "TN": "Tunisia", "DZ": "Algeria",
    "ET": "Ethiopia", "KE": "Kenya", "TZ": "Tanzania", "UG": "Uganda",
    "GH": "Ghana", "NG": "Nigeria", "ZA": "South Africa", "NA": "Namibia",
    "BW": "Botswana", "ZW": "Zimbabwe", "ZM": "Zambia", "MW": "Malawi",
    "MZ": "Mozambique", "AO": "Angola", "SN": "Senegal", "CI": "Ivory Coast",
    "AE": "United Arab Emirates", "SA": "Saudi Arabia", "QA": "Qatar",
    "KW": "Kuwait", "OM": "Oman", "BH": "Bahrain", "YE": "Yemen",
    "IR": "Iran", "IQ": "Iraq", "SY": "Syria", "AF": "Afghanistan",
    "PK": "Pakistan", "BD": "Bangladesh", "LK": "Sri Lanka", "NP": "Nepal",
    "MM": "Myanmar", "KH": "Cambodia", "LA": "Laos", "MN": "Mongolia",
    "KZ": "Kazakhstan", "UZ": "Uzbekistan", "TM": "Turkmenistan",
    "KG": "Kyrgyzstan", "TJ": "Tajikistan", "AZ": "Azerbaijan",
    "AM": "Armenia", "GE": "Georgia",
}

def normalize_country(country):
    """Gibt einen kanonischen englischen Laendernamen zurueck (oder None)."""
    if not country:
        return None
    c = country.strip()
    if not c:
        return None
    # Wenn schon ausgeschrieben, zurueck
    if " " in c or c.lower() in ("uk",):
        return c
    # ISO-Code -> Name
    return COUNTRY_NAME.get(c.upper(), c)


def nominatim_search(query, timeout=15):
    """Sucht `query` bei Nominatim, gibt (lat, lon) oder None zurueck.
    429 -> sleep 5s, retry once.
    """
    for attempt in (0, 1):
        try:
            params = {
                "q": query,
                "format": "json",
                "limit": 1,
                "accept-language": "en",
            }
            url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 429:
                    if attempt == 0:
                        print(f"   [429] sleep 5s, retry", flush=True)
                        time.sleep(5)
                        continue
                    else:
                        return None
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                if data and isinstance(data, list) and len(data) > 0:
                    try:
                        lat = float(data[0]["lat"])
                        lon = float(data[0]["lon"])
                        return (lat, lon)
                    except (KeyError, ValueError, TypeError):
                        return None
                return None
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 0:
                print(f"   [429 HTTPError] sleep 5s, retry", flush=True)
                time.sleep(5)
                continue
            return None
        except Exception as e:
            # Netzwerk-/Timeout-Fehler: einmal retry
            if attempt == 0:
                time.sleep(2)
                continue
            print(f"   [ERR] {type(e).__name__}: {e}", flush=True)
            return None
    return None


def build_fallback_queries(loc):
    """Gibt eine Liste von Fallback-Queries zurueck (in Reihenfolge)."""
    addr = (loc or {}).get("address")
    city = (loc or {}).get("city")
    region = (loc or {}).get("region")
    country = normalize_country((loc or {}).get("country"))
    queries = []
    if addr:
        queries.append(addr)
    # Stadt + Land
    if city and country:
        queries.append(f"{city}, {country}")
    # Region + Land
    if region and country:
        queries.append(f"{region}, {country}")
    # Nur Land
    if country:
        queries.append(country)
    return queries


def main():
    if not INPUT.exists():
        print(f"FATAL: input not found: {INPUT}", file=sys.stderr)
        sys.exit(2)

    with INPUT.open("r", encoding="utf-8") as f:
        entries = [json.loads(line) for line in f if line.strip()]

    total = len(entries)
    print(f"Loaded {total} entries from {INPUT.name}", flush=True)

    out = []
    stats = {
        "total": total,
        "with_addr": 0,
        "without_addr": 0,
        "already_geocoded": 0,
        "geocoded_full": 0,
        "geocoded_fallback": 0,
        "no_result": 0,
        "errors": 0,
    }
    fallback_levels = {}

    last_req_time = 0.0

    for idx, e in enumerate(entries, start=1):
        loc = e.get("location") or {}
        addr = loc.get("address")

        # 1. Workaway-ueberspringen: schon _lat/_lng vorhanden
        existing_lat = e.get("_lat")
        existing_lng = e.get("_lng")
        if existing_lat is not None and existing_lng is not None:
            stats["already_geocoded"] += 1
            print(f"[{idx}/{total}] SKIP (already geocoded): {e.get('name')!r}", flush=True)
            out.append(e)
            continue

        # 2. Ohne Adresse -> null
        if not addr:
            stats["without_addr"] += 1
            new_e = dict(e)
            new_e["_lat"] = None
            new_e["_lng"] = None
            out.append(new_e)
            print(f"[{idx}/{total}] NULL (no addr): {e.get('name')!r}", flush=True)
            continue

        stats["with_addr"] += 1

        # 3. Nominatim-Requests mit Fallback-Chain
        queries = build_fallback_queries(loc)
        result = None
        used_level = None
        for level, q in enumerate(queries):
            # Rate-Limit
            now = time.time()
            wait = 1.1 - (now - last_req_time)
            if wait > 0:
                time.sleep(wait)
            last_req_time = time.time()

            res = nominatim_search(q)
            if res is not None:
                result = res
                used_level = level
                if level == 0:
                    stats["geocoded_full"] += 1
                else:
                    stats["geocoded_fallback"] += 1
                    fallback_levels[level] = fallback_levels.get(level, 0) + 1
                break

        if result is None:
            stats["no_result"] += 1
            new_e = dict(e)
            new_e["_lat"] = None
            new_e["_lng"] = None
            out.append(new_e)
            tag = " NULL"
        else:
            lat, lon = result
            new_e = dict(e)
            new_e["_lat"] = lat
            new_e["_lng"] = lon
            out.append(new_e)
            tag = f" ({lat:.4f},{lon:.4f})"
            if used_level and used_level > 0:
                tag += f" [fallback L{used_level}]"

        # Status alle 25 Eintraege kompakt
        if idx % 25 == 0 or idx == total:
            print(f"[{idx}/{total}] {e.get('name')!r}{tag}", flush=True)
        else:
            print(f"[{idx}/{total}] {e.get('name')!r}{tag}", flush=True)

    # Atomar schreiben
    with OUTPUT.open("w", encoding="utf-8") as f:
        for e in out:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print("", flush=True)
    print("=" * 60, flush=True)
    print("DONE.", flush=True)
    print(f"Total entries:       {stats['total']}", flush=True)
    print(f"With address:        {stats['with_addr']}", flush=True)
    print(f"Without address:     {stats['without_addr']}", flush=True)
    print(f"Already geocoded:    {stats['already_geocoded']}", flush=True)
    print(f"Geocoded (full):     {stats['geocoded_full']}", flush=True)
    print(f"Geocoded (fallback): {stats['geocoded_fallback']}", flush=True)
    if fallback_levels:
        print(f"  Fallback levels:   {fallback_levels}", flush=True)
    print(f"No result (null):    {stats['no_result']}", flush=True)
    print(f"Errors (resilience): {stats['errors']}", flush=True)
    pct = (stats['geocoded_full'] + stats['geocoded_fallback'] + stats['already_geocoded']) / stats['total'] * 100
    print(f"With coords:         {pct:.1f}%", flush=True)
    print(f"Output: {OUTPUT}", flush=True)


if __name__ == "__main__":
    main()