# Orte-Datenbank — Alternativ + Progressiv + Bedeutsam

**Zweck:** Europa-weite Sammlung interessanter Orte für die Caravan-Reise Sommer 2026 (und später). Basis für eine spontan-navigierbare App.

**Träger:** Marcus Grätsch (Konzept) + Rook (Recherche + Pflege)

**Stand:** 2026-06-25 — Aufbau-Phase, Schema definiert, erste Quellen identifiziert.

## Datenformat

- Primärformat: **JSONL** (`orte.jsonl`) — eine JSON-Zeile pro Eintrag, leicht zu parsen, gut für App-Import
- Sekundär: CSV (`orte.csv`) — für Spreadsheet-Sicht
- Pro Eintrag zusätzlich: Markdown-Notiz in `notizen/<id>.md` wenn mehr Kontext nötig

## Schema

Siehe [`schema.md`](./schema.md) für vollständige Definition.

Kurzfassung:
```json
{
  "id": "slug-aus-name",
  "name": "Anzeigename",
  "types": ["ecovillage", "intentional-community"],
  "country": "DE",
  "region": "Sachsen-Anhalt",
  "city": "Beetzendorf",
  "address": "Sieben Linden 1, 38486 Beetzendorf",
  "lat": 52.6833,
  "lon": 10.9833,
  "description": "1-2 Sätze, was es ist / warum interessant",
  "tags": ["vegan-friendly", "open-to-volunteers", "kids-ok"],
  "contact": { "url": "...", "email": "...", "phone": "..." },
  "source": "quellen/contraste.md#ausgabe-512",
  "verified": false,
  "added": "2026-06-25",
  "last_checked": null,
  "notes": "freiwillig, ergänzende Hinweise"
}
```

## Kategorien (Type-Taxonomie)

**Wohnen + Gemeinschaft**
- `ecovillage` — Ökodorf
- `intentional-community` — Intentionale Gemeinschaft
- `housing-project` — Wohnprojekt
- `squat` — Hausprojekt / autonomes Zentrum

**Ökonomie**
- `csa-farm` — Solidarische Landwirtschaft (Solawi)
- `wwoof-farm` — Wwoofing-Hof
- `workaway-host` — Workaway-Gastgeber
- `cooperative` — Genossenschaft
- `food-coop` — Lebensmittelkooperative
- `free-store` — Umsonstladen
- `repair-cafe` — Repair-Café
- `transition-town` — Transition-Town-Initiative

**Kultur + Politik**
- `social-center` — Soziales Zentrum
- `infoshop` — Infoshop / alternatives Buchladen-Café
- `leftist-archive` — Linkes Archiv / Bibliothek
- `artist-colony` — Künstlerkolonie
- `festival` — alternatives / politisches Festival
- `meeting-space` — autonomer Versammlungsraum

**Wasser + Natur**
- `swimming-spot` — Badestelle (See, Küste, Fluss)
- `natural-sanctuary` — Natur-Heiligtum / Schutzgebiet

**Romantik + Geschichte**
- `megalithic-site` — Megalith-Ort (Carnac, Göbekli Tepe etc.)
- `memorial-site` — Gedenkort (Krieg, Widerstand, Versöhnung)
- `pilgrimage-route` — Pilgerroute (Camino, Jakobswege, alternative Routen)

**Schlafen + Praktisch (essentiell!)**
- `stellplatz` — ausgewiesener Wohnmobil-Stellplatz (oft günstig/kostenlos)
- `camping-cheap` — günstiger Campingplatz (Budget)
- `camping-lux` — gehobener Campingplatz
- `freisteh-spot` — tolerierter Wildcamping-Platz (1 Nacht)
- `autohof` — 24h-Rasthof (Notfall-Übernachtung)
- `landvergnuegen` — Bauernhof-Camping (Mitgliedschaft ~30€/J)
- `park4night-spot` — User-generated park4night-Eintrag

> **Praxis-Hinweis:** EU-Lenkzeitverordnung 561/2006 → max. 9h täglich, Pause nach 4,5h, Tagesruhe 11h. Auch in DE muss man manchmal spontan übernachten. Freisteh-Spots sind existenziell.

## Geografischer Scope

Europaweit. Priorität:
- **Tier 1 (voll abdecken):** DE, FR, NL, BE, DK
- **Tier 2 (gute Abdeckung):** UK, IE, ES, PT, IT, AT, CH, CZ, PL, SE
- **Tier 3 (Initial-Abdeckung, dann vertiefen):** NO, FI, GR, HU, RO, EE, LV, LT, HR, SI, SK

**Kategorien-Behandlung: ALLES GLEICH.** Keine Priorisierung einzelner Typen — Ökodörfer, Wwoof-Höfe, Squats, Stellplätze, Freisteh-Spots, Camping, Festivals, Megalith, Gedenkorte etc. werden parallel befüllt.

## Quellen (Recherche-Fahrplan)

Siehe [`recherche-plan.md`](./recherche-plan.md) und [`quellen/`](./quellen/) für detaillierte Source-Notizen.

**Tier-1-Quellen (sofort angehen):**
1. **contraste PDF-Archiv** — durchsuchbar nach Schlagworten, deutsch, 1984–2026
2. **GEN Europe Ecovillage Directory** — https://gen-europe.org/ecovillage-and-network-directory/
3. **Wwoof/Wwofing national** (DE, UK, FR, NL etc.)
4. **Workaway / HelpX** — größte Plattform für Volunteer-Aufenthalte

**Tier-2-Quellen:**
5. **squat.net** — internationales Squat-Verzeichnis
6. **Wikipedia-Listen:** Megalithic sites, Intentional communities, Social centres, etc.
7. **OpenStreetMap** mit Tags wie `social_facility=*, amenity=*, craft=*`
8. **Reparatur-Café-Map** (repaircafe.org)
9. **urgenci.net** — CSA/Solawi-Netzwerk

**Tier-3-Quellen (Später):**
10. Regional-Print (Taz, Le Monde diplomatique, La Découverte, etc.)
11. Spezial-Verzeichnisse (Föderation deutschsprachiger Ökodörfer, Longo Mai, etc.)
12. Persönliches Netzwerk (Florian, Eltern Bremen, etc.)

## Pflegeprozess

1. **Recherche:** Subagent oder manuelle Web-Suche → Roh-Notiz mit Quelle
2. **Aufnahme:** Eintrag in `orte.jsonl` mit `verified: false`, `added: <datum>`
3. **Verifikation:** Später GPS + Adresse gegen OpenStreetMap/Webseite prüfen
4. **Anreicherung:** Tags, Beschreibung, Kontakt, Notizen
5. **Nutzung:** Spätere App oder manuelle Routenplanung

## Aktueller Stand

- Schema: ✅ definiert
- Erste Quellen identifiziert: ✅ (contraste, GEN Europe)
- Erste 5–10 Seed-Einträge: in Arbeit
- Subagent für Massen-Recherche: noch nicht gestartet
- Cron für inkrementelle Recherche: noch nicht eingerichtet

## Offene Entscheidungen

- [ ] App-Format: Native (iOS/Android) oder PWA oder Karte-only?
- [ ] Karten-Backend: OpenStreetMap, Mapbox, Leaflet self-hosted?
- [ ] Sync: Lokal-first oder Cloud-Sync (Nextcloud, eigene DB)?
- [ ] Multi-User: Nur Marcus oder auch teilbar mit Reisebegleitern?

## Konkrete Mitgliedschafts-Fragen

- [ ] **park4night Premium** (~€10/J) — user-generated Spots EU-weit, Offline-Karten, lohnend für die Reise?
- [ ] **Landvergnügen** (~€30/J) — Bauernhöfe, oft sehr günstig, DE-Schwerpunkt
- [ ] **ACSI Camping Card** (~€40/J) — 9.000+ Campingplätze EU-weit, deutliche Rabatte außerhalb HS
