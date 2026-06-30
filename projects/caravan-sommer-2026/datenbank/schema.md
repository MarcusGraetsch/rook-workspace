# Datenbank-Schema

Version 0.1 — 2026-06-25

## Eintrag-Format (JSON, eine Zeile pro Eintrag)

```json
{
  "id": "string-slug-kebab-case",
  "name": "string",
  "types": ["array", "of", "category-keys"],
  "country": "ISO-3166-1-alpha-2",
  "region": "string | null",
  "city": "string | null",
  "address": "string | null",
  "lat": "number | null",
  "lon": "number | null",
  "description": "string (1-3 Sätze)",
  "tags": ["array", "of", "tags"],
  "contact": {
    "url": "string | null",
    "email": "string | null",
    "phone": "string | null"
  },
  "source": "string (Pfad + Anker)",
  "verified": "boolean",
  "added": "YYYY-MM-DD",
  "last_checked": "YYYY-MM-DD | null",
  "notes": "string | null"
}
```

## Feld-Konventionen

### `id`
- Kebab-case Slug, eindeutig
- Format: `<name-kurz>-<stadt>` oder `<name-kurz>-<region>`
- Beispiel: `sieben-linden-beetzendorf`, `longo-mai-cabasse`, `christiania-kopenhagen`

### `types`
- Aus der Type-Taxonomie (siehe `README.md`)
- Mehrere erlaubt (z.B. `["ecovillage", "wwoof-farm", "social-center"]`)

### `country`
- ISO-3166-1-alpha-2 (DE, FR, GB, NL, etc.)

### `lat` / `lon`
- Dezimalgrad, 6 Nachkommastellen
- `null` wenn nicht bekannt (TODO-Marker)
- Verifikation über OpenStreetMap empfohlen

### `description`
- Kurz und prägnant (1-3 Sätze)
- Was ist es? Warum interessant für die Reise?

### `tags`
- Freie Tags, lowercase, kebab-case
- Beispiele: `vegan-friendly`, `kids-ok`, `open-to-volunteers`, `work-trade`, `free-entry`, `bilingual`, `accessible`

### `source`
- Pfad zur Quellen-Notiz mit Anker
- Format: `quellen/<quelle>.md#<anker>`
- Beispiel: `quellen/contraste.md#ausgabe-512-seite-7`

### `verified`
- `false` bei Ersteintrag (unbestätigt)
- `true` nach Cross-Check (Webseite aufgerufen, GPS verifiziert, Kontakt bestätigt)

### `added` / `last_checked`
- ISO-Datum (YYYY-MM-DD)

## Type-Taxonomie

Siehe `README.md` → Kategorien.

Bei neuen Typen: erst README updaten, dann Einträge anlegen.

## Praktische Schlaf-/Park-Kategorien (erweitert)

- `stellplatz` — ausgewiesener Wohnmobil-Stellplatz (oft kostenlos oder günstig, teils mit Ver-/Entsorgung)
- `camping-cheap` — günstiger Campingplatz (Budget-Tipp)
- `camping-lux` — gehobener Campingplatz (nur als Referenz)
- `freisteh-spot` — tolerierter Wildcamping-Platz (1 Nacht, oft legal in Grenzbereich)
- `autohof` — 24h-Rasthof mit LKW-Parkplätzen (Notfall-Übernachtung)
- `landvergnuegen` — Mitgliedschafts-Netz (DE, Bauernhöfe gegen kleine Gebühr)
- `park4night-spot` — User-generierter Eintrag aus park4night-App

**Wichtig (DE):** Lenk- und Ruhezeiten (EU-VO 561/2006) — max. 9h täglich, Pause nach 4,5h = 45 min, Tagesruhe 11h. Auch in DE muss man manchmal spontan übernachten, wenn die Lenkzeit voll ist. Dafür sind Freisteh-Spots unterwegs existenziell.

## Tag-Konventionen

Bevorzugte Standard-Tags:
- `open-to-volunteers` — nimmt Helfer auf
- `work-trade` — Unterkunft gegen Arbeit
- `free-entry` — kostenlos zugänglich
- `kids-ok` — kinderfreundlich
- `vegan-friendly` — vegane Optionen
- `bilingual` — Englisch + Lokalsprache
- `accessible` — barrierearm
- `seasonal` — nur zu bestimmten Zeiten geöffnet
- `camping-on-site` — Caravan/Stellplatz auf dem Gelände

**Schlafen-spezifisch:**
- `free` — kostenlos
- `cheap` — <€10/Nacht
- `mid-range` — €10-20/Nacht
- `expensive` — >€20/Nacht
- `24h` — 24h-Anreise möglich
- `water-grey` — Ver-/Entsorgung vorhanden
- `strom` — Stromanschluss
- `arrival-late` — späte Anreise toleriert
- `wild-card` — wildes Stehen offiziell toleriert
- `legal-grey` — Grauzone
- `safe` — subjektiv sicher (andere Camper vor Ort, beleuchtet)
- `quiet` — nachts ruhig

## Qualitätsregeln

1. **Keine Einträge ohne Quelle.** Lieber unvollständig + `source: TODO`.
2. **Keine doppelten Einträge.** Vor neuem Eintrag: nach Name + Stadt suchen.
3. **GPS bevorzugt aus OpenStreetMap** (offene Daten, gute Genauigkeit).
4. **Adresse** kann initial Stadt + Land sein, wird verfeinert.
5. **`verified: true`** erst nach Web-Check der Quelle.

## CSV-Spiegelung

CSV wird aus JSONL generiert (siehe `tools/build-csv.js` — TODO). Spaltenreihenfolge:
`id,name,types,country,region,city,address,lat,lon,description,tags,contact.url,contact.email,source,verified,added,last_checked`
