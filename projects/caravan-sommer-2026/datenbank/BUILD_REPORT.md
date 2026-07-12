# Build Report — orte.jsonl

**Generated:** 2026-07-12

## Pipeline

- **Input (crawler master)**: `master_initiativen_geocoded.jsonl` (1768 entries)
- **Input (existing curated)**: `orte.jsonl` (82 raw / 57 with id+name)
- **Output**: `orte.jsonl` (1816 entries)

## Merge Logic

- Quality gate: skip entries without `country`/`city`/`lat+lon` (location signal required)
- Dedup against existing curated: by `(name, city|region)` lower-match
- Hand-curated entries WIN conflicts (we trust manual curation over scraping)
- PDF snippets (25 entries without id, mostly raw_text) excluded from merge

## Counts

- **Crawler entries loaded**: 1768
- **Skipped (no quality)**: 5
- **Skipped (duplicate of curated)**: 4
- **Projected (new)**: 1759
- **Hand-curated (preserved)**: 57
- **Final entries**: 1816

## Country distribution

- None: 381
- DE: 286
- US: 220
- CA: 136
- IT: 88
- FR: 82
- ES: 66
- GB: 53
- BR: 46
- PT: 35
- NO: 34
- TR: 31
- GR: 30
- SE: 29
- PE: 28
- CL: 27
- AR: 27
- CO: 23
- AT: 21
- MX: 20

## Type distribution

- `initiative`: 1597
- `wwoof-farm`: 999
- `volunteer-project`: 513
- `housing-project`: 181
- `ecovillage`: 61
- `intentional-community`: 38
- `event`: 15
- `stellplatz`: 13
- `aire-municipale`: 10
- `social-center`: 6
- `csa-farm`: 6
- `cooperative`: 6
- `megalithic-site`: 6
- `festival`: 4
- `camp`: 4
- `education`: 3
- `camping-cheap`: 3
- `freisteh-spot`: 3
- `memorial-site`: 3
- `squat`: 2

## Master Type Mapping (Crawler → Master-Taxonomie)

| Crawler-Type | Master-Type |
|---|---|
| `Aktion` | `event` |
| `Allgemein (Initiativen-Anzeige)` | `initiative-listing` |
| `Alliance Member` | `volunteer-project` |
| `Bildungsveranstaltung` | `education-event` |
| `Bildungszentrum` | `education-center` |
| `Bildungszentrum/Spirituelle Kommune` | `intentional-community` |
| `Camp/Aktion` | `camp-event` |
| `Feministisches Projekt` | `feminist-project` |
| `GEN-Mitglied` | `ecovillage` |
| `Gedenkort/Veranstaltung` | `memorial-event` |
| `Gemeinschaft` | `intentional-community` |
| `Gemeinschaft/Ökdorf` | `ecovillage` |
| `Gemeinschaft/Ökodorf` | `ecovillage` |
| `Hausprojekt` | `housing-project` |
| `HelpStay-Host` | `volunteer-project` |
| `HelpX-Host` | `volunteer-project` |
| `Immobilie` | `housing-project` |
| `Kommune` | `intentional-community` |
| `Solawi` | `csa-farm` |
| `Spirituelle Kommune` | `intentional-community` |
| `Volunteer Exchange` | `volunteer-project` |
| `Volunteer Organisation` | `volunteer-project` |
| `WWOOF-Host` | `wwoof-farm` |
| `Wagenplatz` | `wagon-park` |
| `Wohnprojekt` | `housing-project` |
| `Workaway-Host` | `volunteer-project` |
| `Ökodorf` | `ecovillage` |
| `Ökodorf-Netzwerk` | `ecovillage` |
| `Ökodorf/Gemeinschaft` | `ecovillage` |
| `Ökodorf/Spirituelle Kommune` | `ecovillage` |

## What This Means

- **WWOOF dominates**: 1000 of 1768 crawler entries are WWOOF hosts. After dedup against curated, this is the largest contributor.
- **Volunteer platforms (WWOOF+Workaway+HelpStay+HelpX)**: ~1500 entries → 1500+ projected volunteer-project/wwoof-farm entries.
- **Wohnprojekte**: 180 entries, all DE → housing-project.
- **Ökodörfer**: ~80 entries mixed from netzwerk-oekodorf, GEN, spiritual sources → ecovillage.
- **All crawler entries are `verified: false`** — verification (web page check, GPS in OSM, contact email) is still handwork.

## Next Steps

1. **Browse the new orte.jsonl** — confirm projections look right
2. **Spot-verify** 10-20 high-value candidates (open webseite, check GPS in OSM, send email)
3. **Promote verified: true** for hand-confirmed entries
4. **Filter UI needed** — by country, type, tags (for planning route)
5. **Build CSV mirror** (TODO from schema.md)
