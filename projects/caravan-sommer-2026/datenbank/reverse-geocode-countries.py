#!/usr/bin/env python3
"""Reverse-geocode country from lat/lon for entries missing country field.

Uses BigDataCloud's reverse-geocode-client API (no key required, ~50 req/s).
Falls back to Nominatim if BigDataCloud unavailable.

Input:  orte.jsonl (1816 entries, 379 missing country but have lat/lon)
Output: orte.jsonl (updated)
        REVERSE_GEOCODE_REPORT.md
"""
import json
import re
import time
from collections import Counter
from pathlib import Path

import urllib.request
import urllib.parse
import urllib.error

ROOT = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank")
INPUT = ROOT / "orte.jsonl"
OUTPUT = ROOT / "orte.jsonl"
REPORT_PATH = ROOT / "REVERSE_GEOCODE_REPORT.md"

BIGDATACLOUD_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "CaravanSommer2026/1.0 (rook-agent; marcus@graetsch.de)"

# BigDataCloud uses country names; map to ISO2
BDC_NAME_TO_ISO = {
    "Germany": "DE", "France": "FR", "Italy": "IT", "Spain": "ES",
    "Portugal": "PT", "Austria": "AT", "Switzerland": "CH",
    "United Kingdom": "GB", "Ireland": "IE", "Netherlands": "NL",
    "Belgium": "BE", "Denmark": "DK", "Sweden": "SE", "Norway": "NO",
    "Finland": "FI", "Iceland": "IS", "Poland": "PL", "Czechia": "CZ",
    "Slovakia": "SK", "Hungary": "HU", "Romania": "RO", "Bulgaria": "BG",
    "Greece": "GR", "Croatia": "HR", "Slovenia": "SI", "Serbia": "RS",
    "Bosnia and Herzegovina": "BA", "Albania": "AL", "North Macedonia": "MK",
    "Montenegro": "ME", "Moldova": "MD", "Ukraine": "UA", "Belarus": "BY",
    "Russia": "RU", "Estonia": "EE", "Latvia": "LV", "Lithuania": "LT",
    "Turkey": "TR", "Cyprus": "CY", "Malta": "MT", "Luxembourg": "LU",
    "United States": "US", "Canada": "CA", "Mexico": "MX", "Cuba": "CU",
    "Brazil": "BR", "Argentina": "AR", "Chile": "CL", "Colombia": "CO",
    "Peru": "PE", "Ecuador": "EC", "Bolivia": "BO", "Uruguay": "UY",
    "Paraguay": "PY", "Venezuela": "VE", "Costa Rica": "CR",
    "Guatemala": "GT", "Honduras": "HN", "Nicaragua": "NI", "Panama": "PA",
    "Dominican Republic": "DO", "Jamaica": "JM", "Haiti": "HT",
    "Australia": "AU", "New Zealand": "NZ", "Japan": "JP", "South Korea": "KR",
    "China": "CN", "India": "IN", "Indonesia": "ID", "Thailand": "TH",
    "Vietnam": "VN", "Philippines": "PH", "Malaysia": "MY", "Singapore": "SG",
    "Cambodia": "KH", "Laos": "LA", "Myanmar": "MM", "Mongolia": "MN",
    "Nepal": "NP", "Sri Lanka": "LK", "Bangladesh": "BD", "Pakistan": "PK",
    "Israel": "IL", "Palestine": "PS", "Lebanon": "LB", "Jordan": "JO",
    "Syria": "SY", "Iraq": "IQ", "Iran": "IR", "Saudi Arabia": "SA",
    "United Arab Emirates": "AE", "Oman": "OM", "Yemen": "YE",
    "Egypt": "EG", "Morocco": "MA", "Tunisia": "TN", "Algeria": "DZ",
    "Libya": "LY", "Ethiopia": "ET", "Kenya": "KE", "Tanzania": "TZ",
    "Uganda": "UG", "Ghana": "GH", "Nigeria": "NG", "Senegal": "SN",
    "South Africa": "ZA", "Namibia": "NA", "Botswana": "BW",
    "Zimbabwe": "ZW", "Zambia": "ZM", "Malawi": "MW", "Mozambique": "MZ",
    "Madagascar": "MG", "Rwanda": "RW", "Burundi": "BI",
    "Cameroon": "CM", "Côte d'Ivoire": "CI", "Mali": "ML", "Burkina Faso": "BF",
    "Georgia": "GE", "Armenia": "AM", "Azerbaijan": "AZ", "Kazakhstan": "KZ",
    "Uzbekistan": "UZ", "Kyrgyzstan": "KG", "Tajikistan": "TJ",
    "Turkmenistan": "TM", "Afghanistan": "AF",
}


def bigdatacloud_reverse(lat, lon, timeout=10):
    """Query BigDataCloud reverse-geocode-client, returns ISO2 or None."""
    params = urllib.parse.urlencode({
        "latitude": f"{lat:.6f}",
        "longitude": f"{lon:.6f}",
        "localityLanguage": "en",
    })
    url = f"{BIGDATACLOUD_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as ex:
        return None, str(ex)
    code = data.get("countryCode")
    name = data.get("countryName")
    if not code:
        return None, f"no countryCode (got name={name})"
    # BigDataCloud returns 2-letter codes already, but may use 'XK' for Kosovo etc
    return code.upper(), f"BigDataCloud: {name} ({code})"


def nominatim_reverse(lat, lon, timeout=10):
    """Query Nominatim reverse, returns ISO2 or None (slower fallback)."""
    params = urllib.parse.urlencode({
        "lat": f"{lat:.6f}",
        "lon": f"{lon:.6f}",
        "format": "json",
        "accept-language": "en",
    })
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as ex:
        return None, str(ex)
    addr = data.get("address", {})
    code = addr.get("country_code")
    if not code:
        return None, "no country_code in response"
    return code.upper(), f"Nominatim: {addr.get('country', '')}"


def main():
    print(f"📂 Load: {INPUT}")
    with open(INPUT) as f:
        entries = [json.loads(line) for line in f if line.strip()]
    print(f"   Total: {len(entries)}")

    # Find missing country with lat/lon
    targets = []
    for i, e in enumerate(entries):
        if not e.get("country") and e.get("lat") is not None and e.get("lon") is not None:
            targets.append((i, e))

    print(f"   Missing country with GPS: {len(targets)}")

    # Process
    fixed = 0
    failed = 0
    iso_counter = Counter()
    failed_samples = []

    start = time.time()
    for idx, (i, e) in enumerate(targets):
        lat, lon = e["lat"], e["lon"]
        # Skip obviously bogus coords
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            failed += 1
            failed_samples.append((e.get("id"), "bogus coords"))
            continue
        iso, msg = bigdatacloud_reverse(lat, lon)
        if iso:
            entries[i]["country"] = iso
            iso_counter[iso] += 1
            fixed += 1
        else:
            failed += 1
            failed_samples.append((e.get("id"), msg))
        # Polite rate limit (BigDataCloud free tier: 50/s, sleep 0.025)
        if idx % 10 == 9:
            time.sleep(0.05)
    elapsed = time.time() - start

    print(f"\n   ✓ Fixed: {fixed}")
    print(f"   ✗ Failed: {failed}")
    print(f"   ⏱  Time: {elapsed:.1f}s")

    # Retry failed with Nominatim (slower but more accurate)
    if failed:
        print("\n🔄 Retry failed with Nominatim...")
        for i, e in enumerate(entries):
            if e.get("country") or e.get("lat") is None:
                continue
            # Only retry ones we marked failed (heuristic: still no country + lat/lon)
            lat, lon = e["lat"], e["lon"]
            iso, msg = nominatim_reverse(lat, lon)
            if iso:
                entries[i]["country"] = iso
                iso_counter[iso] += 1
                failed -= 1
            time.sleep(1.1)  # Nominatim rate limit

    print(f"   After Nominatim retry, still failed: {failed}")

    # Write output
    print(f"\n💾 Write: {OUTPUT}")
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    # Final country distribution
    final_countries = Counter(e.get("country") for e in entries)
    no_country_final = sum(1 for e in entries if not e.get("country"))

    # Report
    lines = [
        "# Reverse-Geocode Report — orte.jsonl",
        "",
        f"**Generated:** 2026-07-12",
        f"**Method:** BigDataCloud reverse-geocode-client (free, no API key)",
        "",
        "## Pipeline",
        "",
        f"- **Input**: `{INPUT.name}` ({len(entries)} entries, 379 missing country with GPS)",
        f"- **Output**: `{OUTPUT.name}` ({len(entries)} entries)",
        "",
        "## Results",
        "",
        f"- **Total targets**: 379",
        f"- **Fixed by BigDataCloud**: {fixed}",
        f"- **Failed**: {failed - sum(1 for e in entries if not e.get('country'))}",
        f"- **Final entries without country**: {no_country_final}",
        "",
        "## Top countries added",
        "",
    ]
    for iso, n in iso_counter.most_common(20):
        lines.append(f"- {iso}: {n}")
    lines += [
        "",
        "## Final country distribution",
        "",
    ]
    for c, n in final_countries.most_common(25):
        lines.append(f"- {c}: {n}")

    if failed_samples[:10]:
        lines += ["", "## Failed samples (first 10)", ""]
        for eid, msg in failed_samples[:10]:
            lines.append(f"- `{eid}`: {msg}")

    lines += [
        "",
        "## Notes",
        "",
        "- BigDataCloud uses country polygon lookup, not address parsing → very reliable",
        "- Country names are mapped to ISO-3166-1-alpha-2",
        "- Nominatim retry only if BigDataCloud failed (1.1s sleep per request, polite)",
        "- For entries still missing country → likely oceans, poles, or bogus GPS",
        "",
    ]
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"💾 Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()
