#!/usr/bin/env python3
"""Generate initiativen.js from master_initiativen_geocoded.jsonl (or _geocoded variant)."""
import json
import re
import sys
from pathlib import Path

DEDUP_DIR = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup")
WEB_DIR = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/web")


def make_id(e, i):
    """Stable id from _workaway_host_id, contact_url, or fallback index."""
    wid = e.get("_workaway_host_id")
    if wid:
        return f"w_{wid}"
    url = e.get("contact_url") or e.get("source_url") or ""
    if url:
        m = re.search(r"(\d+)/?$", url.rstrip("/"))
        if m:
            return f"u_{m.group(1)}"
        return f"u_{abs(hash(url)) % 10**9}"
    return f"x_{i}"


def to_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def transform(e, i):
    loc = e.get("location") or {}
    lat = to_float(e.get("_lat")) or to_float(loc.get("lat"))
    lng = to_float(e.get("_lng")) or to_float(loc.get("lng"))
    return {
        "id": make_id(e, i),
        "name": e.get("name", "(ohne Name)"),
        "address": loc.get("address") or "",
        "lat": lat,
        "lng": lng,
        "country": loc.get("country") or "",
        "city": loc.get("city") or "",
        "region": loc.get("region") or "",
        "character": e.get("character") or "",
        "cost": e.get("cost") or "",
        "source": e.get("source") or (e.get("_orig_source_label") or ""),
        "url": e.get("contact_url") or e.get("source_url") or "",
        "email": e.get("contact_email") or "",
        "phone": e.get("contact_phone") or "",
        "description": e.get("description") or "",
        "activities": e.get("activities") or [],
        "types": e.get("types") or [],
    }


# EU + close neighbours for Marcus' Wohnmobil-Sommer
EUROPE_COUNTRIES = {
    # Variants we might see in raw data
    "DE", "Germany", "AT", "Austria", "CH", "Switzerland",
    "FR", "France", "IT", "Italy", "ES", "Spain", "PT", "Portugal",
    "GR", "Greece", "NL", "Netherlands", "Belgium", "BE",
    "DK", "Denmark", "SE", "Sweden", "NO", "Norway", "FI", "Finland",
    "IE", "Ireland", "United Kingdom", "UK", "GB", "Scotland",
    "PL", "Poland", "CZ", "Czech Republic", "Czechia", "HU", "Hungary",
    "RO", "Romania", "BG", "Bulgaria", "HR", "Croatia",
    "SK", "Slovakia", "SI", "Slovenia", "EE", "Estonia",
    "LV", "Latvia", "LT", "Lithuania", "LU", "Luxembourg",
    "MT", "Malta", "CY", "Cyprus", "IS", "Iceland", "LI", "Liechtenstein",
    "Turkey", "TR",  # close neighbour
}


def is_europe(country):
    if not country:
        return False
    return country.strip() in EUROPE_COUNTRIES


def main():
    # Prefer geocoded file, fall back to master
    src = DEDUP_DIR / "master_initiativen_geocoded.jsonl"
    if not src.exists():
        src = DEDUP_DIR / "master_initiativen.jsonl"
        print(f"⚠️  No geocoded file, using {src.name}")
    else:
        print(f"Using {src.name}")

    entries = []
    n_skipped = 0
    with open(src) as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            e = json.loads(line)
            # Only Europe — Wohnmobil-Urlaub
            country = (e.get("location") or {}).get("country", "")
            if not is_europe(country):
                n_skipped += 1
                continue
            entries.append(transform(e, i))

    out = WEB_DIR / "initiativen.js"
    with open(out, "w", encoding="utf-8") as f:
        f.write("// Auto-generated from master_initiativen_geocoded.jsonl — do not edit by hand\n")
        f.write(f"// Generated: 2026-07-07\n")
        f.write(f"// Entries: {len(entries)} (Europe only, skipped {n_skipped} non-EU)\n")
        f.write("window.INITIATIVEN = ")
        f.write(json.dumps(entries, ensure_ascii=False, indent=None))
        f.write(";\n")

    n_with = sum(1 for e in entries if e["lat"] is not None)
    print(f"Wrote {out}: {len(entries)} EU entries ({n_with} with coordinates, {n_skipped} non-EU skipped)")


if __name__ == "__main__":
    main()
