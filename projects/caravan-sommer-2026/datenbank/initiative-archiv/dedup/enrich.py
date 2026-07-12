#!/usr/bin/env python3
"""Enrich wohnprojekte entries with address data via Nominatim reverse geocoding."""
import json
import re
import time
import urllib.request
import urllib.error
from html import unescape

INPUT = '/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup/batch_wohnprojekte_remaining.jsonl'
OUTPUT = '/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup/output_5_remaining.jsonl'
UA = 'CaravanProjectBot/1.0 (address enrichment; contact: research@local)'


def fetch_url(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='ignore')


def extract_map_data(html):
    """Extract data-map-data JSON from page HTML."""
    # Find data-map-data="..."  (could span lines)
    m = re.search(r'data-map-data="(\[.*?\])"', html, re.DOTALL)
    if not m:
        return None
    raw = unescape(m.group(1))
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def extract_location_hints(html):
    """Try to extract a city/locality from the page description text."""
    import re as _re
    from html import unescape as _unescape
    # Strip script/style and HTML tags
    text = _re.sub(r'<script.*?</script>', '', html, flags=_re.DOTALL)
    text = _re.sub(r'<style.*?</style>', '', text, flags=_re.DOTALL)
    text = _re.sub(r'<[^>]+>', ' ', text)
    text = _unescape(text)
    text = _re.sub(r'\s+', ' ', text).strip()

    # Patterns: try in priority order
    patterns = [
        # "liegt in X / Y" or "liegt in X/Y"
        (r'[Ll]ieg[t]? in ([A-ZÄÖÜ][\wäöüß-]+(?:\s*/\s*[A-ZÄÖÜ][\wäöüß-]+)?)', 1),
        # "gelegen in X"
        (r'gelegen in ([A-ZÄÖÜ][\wäöüß-]+(?:\s*/\s*[A-ZÄÖÜ][\wäöüß-]+)?)', 1),
        # "in X / Y" near "Projekt"
        (r'in ([A-ZÄÖÜ][\wäöüß-]+(?:\s*/\s*[A-ZÄÖÜ][\wäöüß-]+)?)\s+(?:ca\.?\s+)?\d+\s*km', 1),
        # "Stadt X" or "Gemeinde X"
        (r'(?:Stadt|Gemeinde)\s+([A-ZÄÖÜ][\wäöüß-]+)', 1),
        # "im [Region] von X" or "im Raum X"
        (r'(?:im\s+Raum|im\s+[A-ZÄÖÜ][a-zäöüß]+kreis\s+[A-ZÄÖÜ][\wäöüß-]+|im\s+[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][\wäöüß-]+)\s+von\s+([A-ZÄÖÜ][\wäöüß-]+)', 1),
    ]
    for pat, grp in patterns:
        m = _re.search(pat, text)
        if m:
            raw = m.group(grp)
            # Take the first part if "X / Y" or "X/Y"
            city = _re.split(r'\s*/\s*', raw)[0].strip()
            return city
    return None


def reverse_geocode(lat, lon, zoom=14):
    """Use Nominatim to reverse geocode lat/lon to an address."""
    if not lat or not lon:
        return None
    url = f'https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom={zoom}&accept-language=de'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode('utf-8'))
            return data.get('address', {})
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"  ! geocode error: {e}", flush=True)
        return None


def pick_city(addr_dict):
    """Pick the most useful city/locality for the address.
    Prefer municipality over village/hamlet, since in Germany 'village' is
    often a sub-part of a larger municipality (Gemeinde)."""
    return (addr_dict.get('city')
            or addr_dict.get('town')
            or addr_dict.get('municipality')
            or addr_dict.get('village')
            or addr_dict.get('hamlet')
            or addr_dict.get('county'))


def format_address(addr_dict, name):
    """Build a clean address string from Nominatim result."""
    if not addr_dict:
        return None
    city = pick_city(addr_dict)
    plz = addr_dict.get('postcode')
    state = addr_dict.get('state')
    road = addr_dict.get('road')
    country = addr_dict.get('country_code', '').upper()

    if not city and not plz:
        return None

    # Build the address string
    parts = []
    if road:
        parts.append(road)
    if plz and city:
        parts.append(f'{plz} {city}')
    elif city:
        parts.append(city)
    elif plz:
        parts.append(plz)

    if not parts:
        return None

    addr = ', '.join(parts)
    return addr


def main():
    with open(INPUT, 'r') as f:
        entries = [json.loads(l) for l in f if l.strip()]

    print(f"Processing {len(entries)} entries")
    found = 0
    not_found = 0

    with open(OUTPUT, 'a') as out:
        for idx, entry in enumerate(entries, 1):
            name = entry.get('name', '')
            source_url = entry.get('source_url', '')
            slug = source_url.rstrip('/').split('/')[-1] if source_url else ''
            print(f"\n[{idx}/{len(entries)}] {name} (slug={slug})", flush=True)

            # Skip if already has an address
            existing_addr = entry.get('location', {}).get('address')
            if existing_addr and existing_addr not in (None, '', 'null'):
                print(f"  -> already has address: {existing_addr}")
                out.write(json.dumps(entry, ensure_ascii=False) + '\n')
                out.flush()
                continue

            # Try to fetch the source page
            if not source_url:
                print(f"  -> no source_url, writing as-is")
                out.write(json.dumps(entry, ensure_ascii=False) + '\n')
                out.flush()
                not_found += 1
                continue

            try:
                html = fetch_url(source_url)
            except Exception as e:
                print(f"  ! fetch error: {e}")
                out.write(json.dumps(entry, ensure_ascii=False) + '\n')
                out.flush()
                not_found += 1
                continue

            map_data = extract_map_data(html)
            if not map_data or not isinstance(map_data, list) or not map_data:
                print(f"  ! no map data")
                out.write(json.dumps(entry, ensure_ascii=False) + '\n')
                out.flush()
                not_found += 1
                continue

            md = map_data[0]
            lat = md.get('lat') or ''
            lng = md.get('lng') or ''
            plz_src = md.get('plz') or ''
            city_src = md.get('city') or ''
            street_src = md.get('street') or ''

            # Try to extract city from page text first
            hint_city = extract_location_hints(html)
            if hint_city:
                print(f"  text hint: city={hint_city}")

            if not lat or not lng:
                # Use text hint if we have one
                if hint_city:
                    entry['location']['city'] = hint_city
                    entry['location']['address'] = hint_city
                    print(f"  ✓ from text: {hint_city}")
                    found += 1
                else:
                    print(f"  ! no lat/lng in data")
                    not_found += 1
                out.write(json.dumps(entry, ensure_ascii=False) + '\n')
                out.flush()
                continue

            # Reverse geocode to get full address
            time.sleep(1.1)  # Nominatim rate limit
            addr_dict = reverse_geocode(lat, lng)

            addr = None
            city = None
            region = None
            country = 'DE'

            if addr_dict:
                city = pick_city(addr_dict)
                plz = addr_dict.get('postcode') or plz_src
                state = addr_dict.get('state')
                road = addr_dict.get('road') or street_src
                country_code = (addr_dict.get('country_code') or 'de').upper()

                # Prefer text hint over Nominatim city if we have one
                if hint_city:
                    # Only override if Nominatim city isn't more specific (has PLZ)
                    if plz:
                        # keep Nominatim result for address, but use hint as city
                        city = hint_city
                    else:
                        city = hint_city

                # Build address string
                if road and plz and city:
                    addr = f"{road}, {plz} {city}"
                elif road and city:
                    addr = f"{road}, {city}"
                elif plz and city:
                    addr = f"{plz} {city}"
                elif city:
                    addr = city
                elif plz:
                    addr = plz

                # Map state to region
                if state:
                    region = state

                country = country_code

            # Fallback to source fields if no addr found
            if not addr and plz_src and city_src:
                addr = f"{plz_src} {city_src}".strip()
            if not city and city_src:
                city = city_src
            if not city and hint_city:
                city = hint_city
            if not addr and city:
                addr = city
            if not addr and hint_city and not city:
                addr = hint_city

            if addr:
                print(f"  ✓ FOUND: city={city}, region={region}, address={addr}")
                entry['location']['city'] = city
                entry['location']['region'] = region
                entry['location']['address'] = addr
                entry['location']['country'] = country
                found += 1
            else:
                print(f"  -> no address found")
                not_found += 1

            out.write(json.dumps(entry, ensure_ascii=False) + '\n')
            out.flush()

    print(f"\n=== Summary: {found} addresses found, {not_found} not found (of {len(entries)}) ===")


if __name__ == '__main__':
    main()
