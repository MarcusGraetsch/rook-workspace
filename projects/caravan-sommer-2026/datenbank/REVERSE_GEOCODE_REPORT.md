# Reverse-Geocode Report — orte.jsonl

**Generated:** 2026-07-12
**Method:** BigDataCloud reverse-geocode-client (free, no API key)

## Pipeline

- **Input**: `orte.jsonl` (1816 entries, 379 missing country with GPS)
- **Output**: `orte.jsonl` (1816 entries)

## Results

- **Total targets**: 379
- **Fixed by BigDataCloud**: 379
- **Failed**: -2
- **Final entries without country**: 2

## Top countries added

- CR: 13
- NP: 13
- MY: 12
- EC: 12
- VN: 12
- US: 11
- IS: 10
- KR: 10
- IN: 9
- RO: 9
- GB: 9
- ID: 8
- GH: 8
- GE: 7
- ZA: 7
- ZM: 7
- GF: 7
- AU: 7
- PH: 6
- SN: 6

## Final country distribution

- DE: 286
- US: 231
- CA: 136
- IT: 91
- FR: 85
- ES: 68
- GB: 62
- BR: 46
- PT: 35
- NO: 34
- TR: 32
- GR: 32
- PE: 31
- SE: 29
- CL: 27
- AR: 27
- CO: 25
- AT: 21
- TZ: 20
- MX: 20
- IE: 19
- FI: 17
- MA: 17
- UG: 17
- KE: 16

## Notes

- BigDataCloud uses country polygon lookup, not address parsing → very reliable
- Country names are mapped to ISO-3166-1-alpha-2
- Nominatim retry only if BigDataCloud failed (1.1s sleep per request, polite)
- For entries still missing country → likely oceans, poles, or bogus GPS
