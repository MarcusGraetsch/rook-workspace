#!/usr/bin/env python3
"""Build orte.jsonl from crawler master + existing curated entries.

Input:
  - dedup/master_initiativen_geocoded.jsonl (deduplicated crawler output)
  - orte.jsonl (existing curated entries, hand-built)

Output:
  - orte.jsonl (merged, projected to master schema)
  - BUILD_REPORT.md (statistics)
"""
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank")
DEDUP_DIR = ROOT / "initiative-archiv" / "dedup"
INPUT_MASTER = DEDUP_DIR / "master_initiativen_geocoded.jsonl"
EXISTING_ORTE = ROOT / "orte.jsonl"
OUTPUT_ORTE = ROOT / "orte.jsonl"
REPORT_PATH = ROOT / "BUILD_REPORT.md"

TODAY = "2026-07-12"

# --- Crawler → Master Type Mapping ---
TYPE_MAP = {
    # Volunteer platforms
    "WWOOF-Host": "wwoof-farm",
    "Workaway-Host": "volunteer-project",
    "HelpStay-Host": "volunteer-project",
    "HelpX-Host": "volunteer-project",
    "Volunteer Organisation": "volunteer-project",
    "Volunteer Exchange": "volunteer-project",
    "Alliance Member": "volunteer-project",
    # Housing
    "Wohnprojekt": "housing-project",
    "Hausprojekt": "housing-project",
    "Wagenplatz": "wagon-park",
    "Immobilie": "housing-project",
    # Communities
    "Ökodorf": "ecovillage",
    "Ökodorf/Gemeinschaft": "ecovillage",
    "Ökodorf/Spirituelle Kommune": "ecovillage",
    "Ökodorf-Netzwerk": "ecovillage",
    "Gemeinschaft/Ökodorf": "ecovillage",
    "Gemeinschaft/Ökdorf": "ecovillage",
    "Gemeinschaft": "intentional-community",
    "Kommune": "intentional-community",
    "Spirituelle Kommune": "intentional-community",
    "Bildungszentrum/Spirituelle Kommune": "intentional-community",
    "GEN-Mitglied": "ecovillage",
    # Solawi / CSA
    "Solawi": "csa-farm",
    # Education / Events
    "Bildungsveranstaltung": "education-event",
    "Bildungszentrum": "education-center",
    "Aktion": "event",
    "Camp/Aktion": "camp-event",
    "Gedenkort/Veranstaltung": "memorial-event",
    "Feministisches Projekt": "feminist-project",
    "Allgemein (Initiativen-Anzeige)": "initiative-listing",
}


def map_type(t):
    """Map crawler type string to master-type. Falls back to 'initiative'."""
    if not t:
        return None
    return TYPE_MAP.get(t.strip(), "initiative")


# --- Character → Tags ---
CHARACTER_TAGS = {
    "ökologisch-gemeinschaftlich": ["ecovillage", "permaculture", "community-living"],
    "ökologisch": ["ecological"],
    "pragmatisch": ["pragmatic"],
    "gemeinschaftlich": ["community-living"],
    "spirituell": ["spiritual", "intentional-community"],
    "gemeinnützig": ["nonprofit"],
    "basisdemokratisch": ["basisdemocratic"],
    "anarchistisch/basisdemokratisch": ["anarchist", "basisdemocratic"],
    "Mehrgenerationen": ["multigenerational"],
    "christlich-spirituell": ["christian-spiritual", "spiritual"],
    "sozial": ["social"],
}

# --- Type-array Tag Hints ---
TYPE_TAG_HINTS = {
    "Biohof": "biofarm",
    "Permakultur": "permaculture",
    "Biodynamisch": "biodynamic",
    "Zertifiziert Bio": "certified-organic",
    "Ganzheitlich": "holistic",
    "Mitstreiter*innen gesucht": "looking-for-people",
    "Cultural exchange": "cultural-exchange",
    "Language exchange": "language-exchange",
    "Projekt in Gründung": "founding-phase",
    "Realisiertes Projekt": "established",
    "Projektgruppe": "project-group",
    "EU-Focus": "eu-focus",
}


# --- Helpers ---
def slugify(text, max_len=50):
    """Kebab-case slug from arbitrary text. Unicode-safe."""
    if not text:
        return "unknown"
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:max_len].strip("-") or "unknown"


def norm_country(c):
    """Normalize country names to ISO-3166-1-alpha-2."""
    if not c:
        return None
    c = c.strip()
    # Map known full names → ISO2
    name_map = {
        "germany": "DE", "deutschland": "DE", "de": "DE",
        "france": "FR", "frankreich": "FR", "fr": "FR",
        "italy": "IT", "italien": "IT", "it": "IT",
        "spain": "ES", "spanien": "ES", "es": "ES",
        "portugal": "PT", "pt": "PT",
        "austria": "AT", "österreich": "AT", "at": "AT",
        "switzerland": "CH", "schweiz": "CH", "ch": "CH",
        "united kingdom": "GB", "uk": "GB", "großbritannien": "GB", "england": "GB",
        "ireland": "IE", "irland": "IE", "ie": "IE",
        "netherlands": "NL", "niederlande": "NL", "nl": "NL",
        "belgium": "BE", "belgien": "BE", "be": "BE",
        "denmark": "DK", "dänemark": "DK", "dk": "DK",
        "sweden": "SE", "schweden": "SE", "se": "SE",
        "norway": "NO", "norwegen": "NO", "no": "NO",
        "finland": "FI", "finnland": "FI", "fi": "FI",
        "poland": "PL", "polen": "PL", "pl": "PL",
        "czech republic": "CZ", "tschechien": "CZ", "cz": "CZ",
        "greece": "GR", "griechenland": "GR", "gr": "GR",
        "turkey": "TR", "türkei": "TR", "tr": "TR",
        "united states": "US", "usa": "US", "us": "US",
        "canada": "CA", "kanada": "CA", "ca": "CA",
        "mexico": "MX", "mexiko": "MX", "mx": "MX",
        "brazil": "BR", "brasilien": "BR", "br": "BR",
        "argentina": "AR", "argentinien": "AR", "ar": "AR",
        "chile": "CL", "cl": "CL",
        "colombia": "CO", "kolumbien": "CO", "co": "CO",
        "peru": "PE", "perú": "PE", "pe": "PE",
        "tanzania": "TZ", "tansania": "TZ", "tz": "TZ",
        "kenya": "KE", "ke": "KE",
        "uganda": "UG", "uganda ": "UG", "ug": "UG",
        "morocco": "MA", "marokko": "MA", "ma": "MA",
    }
    normed = c.lower().strip()
    if normed in name_map:
        return name_map[normed]
    if len(normed) == 2 and normed.isalpha():
        return normed.upper()
    return None


def unique_id(base_name, base_loc, existing_ids, used_ids):
    """Generate a unique kebab-case slug. Append suffix if collision."""
    base = slugify(base_name)
    if base_loc:
        base = f"{base}-{slugify(base_loc)}"
    candidate = base
    suffix = 2
    while candidate in used_ids or candidate in existing_ids:
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def project_entry(crawler_entry, existing_ids, used_ids):
    """Convert crawler entry → master-schema dict."""
    name = (crawler_entry.get("name") or "").strip()
    if not name:
        return None

    loc = crawler_entry.get("location") or {}
    city = loc.get("city")
    region = loc.get("region")
    address = loc.get("address")
    country = norm_country(loc.get("country"))

    # Type mapping: prefer 'type' (single, more reliable) → array 'types'
    master_type = map_type(crawler_entry.get("type"))
    types_list = []
    if master_type:
        types_list.append(master_type)
    # Also map array types
    for t in crawler_entry.get("types") or []:
        mapped = map_type(t)
        if mapped and mapped not in types_list:
            types_list.append(mapped)

    # Tags from character
    tags = []
    char = crawler_entry.get("character")
    if char and char in CHARACTER_TAGS:
        tags.extend(CHARACTER_TAGS[char])

    # Tags from type-array hints
    for t in crawler_entry.get("types") or []:
        if t in TYPE_TAG_HINTS:
            tag = TYPE_TAG_HINTS[t]
            if tag not in tags:
                tags.append(tag)

    # Contact: 'contact_*' fields → nested object
    contact = {
        "url": crawler_entry.get("contact_url"),
        "email": crawler_entry.get("contact_email"),
        "phone": crawler_entry.get("contact_phone"),
    }

    # ID: kebab-case slug from name + city/region
    location_part = city or region or country
    eid = unique_id(name, location_part, existing_ids, used_ids)

    # Description: truncate to 1-3 sentences if possible
    desc = crawler_entry.get("description") or ""
    if desc:
        # Trim to 1-3 sentences (~280 chars)
        sentences = re.split(r"(?<=[.!?])\s+", desc.strip())
        desc = " ".join(sentences[:3])[:280].strip()
        if len(desc) > 270:
            desc = desc[:267].rsplit(" ", 1)[0] + "..."

    # Source reference
    sources = crawler_entry.get("sources") or []
    src_label = crawler_entry.get("_orig_source_label", crawler_entry.get("_source_file", ""))
    source = f"quellen/crawler-{src_label.replace('/', '-')}.md"

    out = {
        "id": eid,
        "name": name,
        "types": types_list or ["initiative"],
        "country": country,
        "region": region,
        "city": city,
        "address": address,
        "lat": crawler_entry.get("_lat"),
        "lon": crawler_entry.get("_lng"),
        "description": desc or None,
        "tags": tags,
        "contact": contact,
        "source": source,
        "source_url": crawler_entry.get("source_url"),
        "verified": False,
        "added": TODAY,
        "last_checked": None,
        "notes": None,
    }
    return out


def has_minimum_data(entry):
    """Quality gate: skip entries with no location signal at all."""
    return (
        entry.get("country")
        or entry.get("city")
        or (entry.get("lat") and entry.get("lon"))
    )


def main():
    # Load crawler master
    print(f"📂 Load: {INPUT_MASTER}")
    with open(INPUT_MASTER) as f:
        crawler_entries = [json.loads(line) for line in f if line.strip()]
    print(f"   Crawler entries: {len(crawler_entries)}")

    # Load existing curated
    print(f"📂 Load: {EXISTING_ORTE}")
    existing = []
    with open(EXISTING_ORTE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                existing.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    print(f"   Existing curated: {len(existing)}")

    # Index existing by id and by (name, city) for merge
    existing_by_id = {}  # id → entry
    existing_by_name_city = defaultdict(list)  # (lowered name, lowered city) → [entries]
    existing_no_id = []  # entries without id (PDF snippets)
    for e in existing:
        if e.get("id"):
            existing_by_id[e["id"]] = e
            key = (
                (e.get("name") or "").lower().strip(),
                (e.get("city") or e.get("region") or "").lower().strip(),
            )
            existing_by_name_city[key].append(e)
        else:
            existing_no_id.append(e)

    print(f"   With ID: {len(existing_by_id)}, no-ID (PDF snippets): {len(existing_no_id)}")

    # Project crawler entries → master schema
    projected = []
    skipped = 0
    duplicate_of_existing = 0
    used_ids = set()
    for ce in crawler_entries:
        proj = project_entry(ce, set(existing_by_id.keys()), used_ids)
        if proj is None:
            skipped += 1
            continue
        if not has_minimum_data(proj):
            skipped += 1
            continue
        # Check duplicate with existing curated
        key = (
            proj["name"].lower().strip(),
            (proj.get("city") or proj.get("region") or "").lower().strip(),
        )
        if existing_by_name_city.get(key):
            duplicate_of_existing += 1
            continue
        used_ids.add(proj["id"])
        projected.append(proj)

    print(f"   ✓ Projected: {len(projected)}")
    print(f"   ✗ Skipped (no name/location): {skipped}")
    print(f"   ✗ Duplicate of existing curated: {duplicate_of_existing}")

    # Build merge list: existing (filtered) + projected
    # Filter existing to only entries with id and meaningful data
    valid_existing = [e for e in existing if e.get("id") and e.get("name")]
    print(f"   Valid existing (with id+name): {len(valid_existing)}")

    # Merge: existing first (these win), then projected
    merged = list(valid_existing) + projected

    # Write output
    print(f"\n💾 Write: {OUTPUT_ORTE}")
    with open(OUTPUT_ORTE, "w", encoding="utf-8") as f:
        for e in merged:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"   Total entries written: {len(merged)}")

    # Stats
    countries = Counter(e.get("country") for e in merged)
    types_all = Counter()
    for e in merged:
        for t in e.get("types", []):
            types_all[t] += 1

    # Write report
    lines = [
        "# Build Report — orte.jsonl",
        "",
        f"**Generated:** {TODAY}",
        "",
        "## Pipeline",
        "",
        f"- **Input (crawler master)**: `{INPUT_MASTER.name}` ({len(crawler_entries)} entries)",
        f"- **Input (existing curated)**: `{EXISTING_ORTE.name}` ({len(existing)} raw / {len(valid_existing)} with id+name)",
        f"- **Output**: `{OUTPUT_ORTE.name}` ({len(merged)} entries)",
        "",
        "## Merge Logic",
        "",
        "- Quality gate: skip entries without `country`/`city`/`lat+lon` (location signal required)",
        "- Dedup against existing curated: by `(name, city|region)` lower-match",
        "- Hand-curated entries WIN conflicts (we trust manual curation over scraping)",
        "- PDF snippets (25 entries without id, mostly raw_text) excluded from merge",
        "",
        "## Counts",
        "",
        f"- **Crawler entries loaded**: {len(crawler_entries)}",
        f"- **Skipped (no quality)**: {skipped}",
        f"- **Skipped (duplicate of curated)**: {duplicate_of_existing}",
        f"- **Projected (new)**: {len(projected)}",
        f"- **Hand-curated (preserved)**: {len(valid_existing)}",
        f"- **Final entries**: {len(merged)}",
        "",
        "## Country distribution",
        "",
    ]
    for c, n in countries.most_common(20):
        lines.append(f"- {c}: {n}")
    lines += [
        "",
        "## Type distribution",
        "",
    ]
    for t, n in types_all.most_common(20):
        lines.append(f"- `{t}`: {n}")
    lines += [
        "",
        "## Master Type Mapping (Crawler → Master-Taxonomie)",
        "",
        "| Crawler-Type | Master-Type |",
        "|---|---|",
    ]
    for src, dst in sorted(TYPE_MAP.items()):
        lines.append(f"| `{src}` | `{dst}` |")
    lines += [
        "",
        "## What This Means",
        "",
        "- **WWOOF dominates**: 1000 of 1768 crawler entries are WWOOF hosts. After dedup against curated, this is the largest contributor.",
        "- **Volunteer platforms (WWOOF+Workaway+HelpStay+HelpX)**: ~1500 entries → 1500+ projected volunteer-project/wwoof-farm entries.",
        "- **Wohnprojekte**: 180 entries, all DE → housing-project.",
        "- **Ökodörfer**: ~80 entries mixed from netzwerk-oekodorf, GEN, spiritual sources → ecovillage.",
        "- **All crawler entries are `verified: false`** — verification (web page check, GPS in OSM, contact email) is still handwork.",
        "",
        "## Next Steps",
        "",
        "1. **Browse the new orte.jsonl** — confirm projections look right",
        "2. **Spot-verify** 10-20 high-value candidates (open webseite, check GPS in OSM, send email)",
        "3. **Promote verified: true** for hand-confirmed entries",
        "4. **Filter UI needed** — by country, type, tags (for planning route)",
        "5. **Build CSV mirror** (TODO from schema.md)",
        "",
    ]
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"💾 Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()
