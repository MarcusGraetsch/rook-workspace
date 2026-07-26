# Personal & Travel

## Überblick

Reiseplanung, Road-Trips, und persönliche Notizen. Marcus ist seit 2024 als Consultant viel in Deutschland unterwegs — aber privat eher Camping/RV als Hotels.

## Reiseplanung

- **Travel Planner GPT** für Routenplanung
- **ChatGPT** für Hotel-/Flugvergleiche
- Road-Trip-Planung: Deutschland, Osteuropa
- **Langfristiges Ziel:** Mit dem Caravan durch Europa (siehe MEMORY.md)

## Konkrete Reiseinteressen

- **Berlin → Balkan**: Routenplanung für nächsten Sommer
- **Italien**: Toskana, Emilia-Romagna (Essen + Kultur)
- **Skandinavien**: Schweden, Norwegen (Natur, Camping)

## Travel Tech

- Offline-Karten für road trips (kein Google Maps Backup nötig)
- Booking.com, Kayak für Hotels
- Airbnb für längere Aufenthalte

## Whole Earth Catalog Spirit

Reisen ist für Marcus nicht „Urlaub vom Job", sondern bewusste Praxis im Geist des **Whole Earth Catalog** (Brand, 1968–74) — „Access to Tools", ehrliche Infos, selbstbestimmtes Leben, Do-it-yourself, Ökologie + Cyber + Community. Konkret:

- **Alternativ-Reiseführer** statt Mainstream-Tourismus (siehe `projekte/caravan-sommer-2026/`)
- **Wohnmobil/Caravan** statt Hotel — Unabhängigkeit von Buchungsplattformen
- **Anknüpfung an Initiativen** unterwegs (Solawi-Höfe, Ökodörfer, Wagenplätze, Workaway/Wwoofing)

## Caravan-Sommer-2026 — Datenbank

*Stand 2026-07-19 — repo: `projects/caravan-sommer-2026/`*

Datenbank für alternativen Urlaub abseits vom Mainstream. Spirit: Whole Earth Catalog Edition. Scope: **bundesweit / europaweit**, nicht Berlin-only. Spirituelle Communities sind ausdrücklich erwünscht (Findhorn, Schloss Tempelhof, ZEGG, Sieben Linden, Lebensgarten Steyerberg, Kommune Niederkaufungen). „Too much Hippie" ist KEIN Ausschlusskriterium.

### Aktueller Datenstand

| Datei | Einträge | Rolle |
|-------|----------|-------|
| `orte.jsonl` | **1816** | Master-Datei (crawler + hand-curated zusammengeführt) |
| `orte.csv` | 1816 (mit Header) | Spreadsheet-Sicht |
| `hand-curated.jsonl` | **82** | Manuell kuratierte Einträge mit Marcus-Quality (Anker-Termine, Ökodörfer, historische Orte) |
| `master_initiativen_geocoded.jsonl` | 1768 | Crawler-Rohdaten |

### Pipeline (Schritt für Schritt)

1. **Crawling:** Crawlee + BeautifulSoup (`crawler/initiative_crawl.py`) gegen Quellen-Pool (s.u.)
2. **Quality-Gate:** Einträge ohne `country`/`city`/`lat+lon` werden aussortiert
3. **Dedup:** gegen `hand-curated` per `(name, city|region)` lower-match — hand-curated gewinnt
4. **Reverse-Geocoding:** BigDataCloud (379 Einträge ohne Country, dann auf 2 reduziert — siehe `REVERSE_GEOCODE_REPORT.md`, 2026-07-12)
5. **Master-Type-Mapping:** Crawler-Typen werden auf Master-Taxonomie gemappt (`Aktion` → `event`, `Alliance Member` → `volunteer-project`, `Art Community` → `art-community`, …)
6. **Build:** `orte.jsonl` + `orte.csv` aus den gemergten Daten
7. **UI:** `orte-filter.html` (Single-Page-App, Filter: Land/Type/Suche/Tags)

### Datenbank-Schema

Siehe `datenbank/schema.md` (v0.1, 2026-06-25). Felder: `id` (slug), `name`, `types[]`, `country` (ISO-3166-1-alpha-2), `region`, `city`, `address`, `lat`, `lon`, `description`, `tags[]`, `contact{url,email,phone}`, `source`, `verified`, `added`, `last_checked`, `notes`.

### Type-Taxonomie (Master)

- **Wohnen + Gemeinschaft:** `ecovillage`, `intentional-community`, `housing-project`, `squat`
- **Ökonomie:** `csa-farm`, `wwoof-farm`, `workaway-host`, `cooperative`, `food-coop`, `free-store`, `repair-cafe`, `transition-town`
- **Kultur + Politik:** `social-center`, `infoshop`, `leftist-archive`, `artist-colony`, `festival`, `meeting-space`
- **Wasser + Natur:** `swimming-spot`, `natural-sanctuary`
- **Romantik + Geschichte:** `megalithic-site`, `memorial-site`, `pilgrimage-route`
- **Schlafen + Praktisch (essentiell!):** `stellplatz`, `camping-cheap`, `camping-lux`, `freisteh-spot`, `autohof`, `landvergnuegen`, `park4night-spot`, `aire-municipale`

### Quellen-Pool

Siehe `datenbank/recherche-plan.md` für detaillierten Plan. Tier-1:

- **park4night** — User-generated Stellplätze, EU-weit
- **Stellplatz.info** — 5.000+ DE-Stellplätze
- **Landvergnügen** — Bauernhof-Camping-Mitgliedschaft (~30 €/J)
- **ACSI** — Camping Card, EU-weit 9.000+ Plätze
- **contraste.org** — Monatszeitschrift für Selbstbestimmung (1984–2024 Archiv, dann online) — **Hauptquelle für Adressen DACH**
- **GEN Europe Directory** — Europäische Ökodörfer
- **Wwoof DE/UK/FR/NL** — Farm-Host-Verzeichnisse
- **Workaway / HelpX** — Volunteer-Hosts (10.000+ weltweit)
- **squat.net** — Internationale Squats/Social-Centers
- **Wikipedia-Listen** — Megalith, Intentional Communities, Social Centres
- **OpenStreetMap Overpass API** — social_facility, community_centre Tags
- **Repair-Café Map**, **Urgenci CSA/Solawi-Netzwerk**

### Country-Distribution (orte.jsonl, 2026-07-12)

Top 15: DE (286), US (231), CA (136), IT (91), FR (85), ES (68), GB (62), BR (46), PT (35), NO (34), TR (32), PE (31), GR (32), SE (29), CL/AR (27).

> Anmerkung: Hohe US/CA-Anteile kommen aus den Workaway/HelpX-Crawler-Quellen. Für die Caravan-Reise sind die EU-Anteile (DE, FR, IT, ES, GB, NL, BE, AT, CH) primär relevant.

### Anker-Termine Reise 2026 (hand-curated Highlights)

- **ASF Volontaires Escures** (Commes, Normandie) — Freiwilligenstandort seit 1976, 50-Jahr-Feier **31.7.–2.8.2026**, Kontakt Florian
- **La ZAD Notre-Dame-des-Landes** (Loire-Atlantique) — Langjähriges autonomes Territorium, iconic
- **Longo Maï Cabasse** (Var, Provence) — Europäisches Kommune-Netzwerk seit 1968
- **Sieben Linden** (Beetzendorf, Sachsen-Anhalt) — Eines der größten DE-Ökodörfer (~180 Menschen)
- **ZEGG** (Bad Belzig, Brandenburg) — Tamera-Forschung, Sommerakademien
- **Schloss Tempelhof** (Creglingen, Baden-Württemberg) — Demokratische Gemeinschaft
- **Tamera** (Colos, Alentejo/PT) — ~200 Menschen, Friedensforschung
- **Lebensgarten Steyerberg** (Niedersachsen) — DE-Ökodorf

### UI / App

`datenbank/orte-filter.html` (419 Zeilen, Stand 2026-07-12): Single-Page-App im Whole-Earth-Style (sepia, beige `#f5f3ee`, accent `#8b6e3f`), Filter nach Land/Type/Suche/Tags, lädt `orte.jsonl` client-side. **Lokal im Browser öffnen** — funktioniert offline.

### Rechtliches / Praktisch (DE)

- EU-Lenkzeitverordnung 561/2006 → max. 9h täglich, Pause nach 4,5h, Tagesruhe 11h
- StVO §12 (Halten/Parken), §31 (OWi) — Wildcampen verboten, aber 1 Nacht zur Wiederherstellung der Fahrtüchtigkeit oft toleriert
- Landesrecht variiert (Bayern strenger, NRW liberaler)
- Wichtig: nicht auf Privatgrund ohne Erlaubnis, nicht in NSG, nicht länger als 1 Nacht

## Resilience-Aspekt

Wohnmobil-Mobilität ist nicht nur Lifestyle, sondern Teil der **Resilience-Architektur** (siehe `private/marcus-resilience-todo.md`): geografische Flexibilität als Antwort auf geopolitische Risiken (Europa-Russland). Caravan-Standorte als Backup-Standorte für Hardware/Daten im 3-2-1-Modell.

## Reise-Anti-Patterns

- **Keine All-Inclusive-Resorts** — Hauptsache billig / Tausch / Workaway
- **Keine reinen Tourist-Hotspots** — lieber 2. Reihe mit lokalem Leben
- **Keine Flug-Kurzstrecken** (Klimabilanz), wo Zug oder Caravan geht
- **Kein 5-Sterne-Hotel** — lieber einfache Pensionen / Camping / bei Leuten

## Ostsee-Tour 2026 — Konkrete Reise

*Stand 2026-07-26 — repo: `working-notes/` (Codex-managed), Live: https://working-notes.org/ostsee-tour/*

Anders als die Caravan-Sommer-2026-DB (siehe oben) ist das hier **eine konkrete, durchgeplante Reise** mit fester Route, fixen Daten und Live-Karte. Ergänzt sich, ist aber nicht dasselbe.

### Eckdaten

- **Dauer:** 27 Tage, 28.07.–23.08.2026
- **Strecke:** ~1.810 km (Bremen → Berlin, über Herzberg, Saale, Elbe, Mecklenburg, Rügen, Usedom, Schorfheide)
- **Fahrzeug:** Hymer-Fiat-Ducato 1985, H-Kennzeichen, 2,75 m hoch, 3,2 t zGG, 10 L/100 km
- **Tagesbudget:** ~87 €/Tag (Diesel + Stellplatz + Lebensmittel — gesamt ~2.350 €)
- **Live-Karte:** https://working-notes.org/ostsee-tour/ (Leaflet, 41 Routenpunkte, 27 Campingplätze, 8 Stellplätze, 5 Bade-Stops, 13 Sehenswürdigkeiten, 3 Festivals)

### Die 27 Etappen

| Tag | Datum | Strecke | km | Hinweise |
|-----|-------|---------|----|----------|
| 1 | Di 28.07. | Bremen → Herzberg | 360 | B71/B27, ~5–5,5 Std. |
| 2 | Mi 29.07. | Aufbauen, Werra-Badestrand | 0 | Akklimatisation |
| 3–6 | Do–So 30.07.–02.08. | **Herzberg Festival** | 0 | 4 Tage, Breitenbach am Herzberg |
| 7 | Mo 03.08. | Herzberg → Jena | 245 | Eisenach/Gotha/Erfurt, ~3,5–4 Std. |
| 8 | Di 04.08. | Jena → Torgau | 215 | Saale-Stausee/Leipzig, ~3–3,5 Std. |
| 9 | Mi 05.08. | Torgau → Brandenburg | 250 | Torgau vertiefen (Schloss Hartenfels, Stadtkirche St. Marien, Denkmal der Begegnung); Dessau/Wörlitz nachmittags, ~4 Std. |
| 10 | Do 06.08. | Brandenburg → Ahrenshoop/Prerow | 300 | Plau am See (Baden!), ~4,5–5 Std. |
| 11 | Fr 07.08. | Prerow → Nonnevitz/Rügen | 95 | Stralsund, ~1,5 Std. |
| 12–14 | Sa–Mo 08.–10.08. | Luigis Nonnevitz | 0 | 3 Tage Stellplatz am Rügener Weststrand |
| 15 | Di 11.08. | Rügen → Świnoujście | 95 | Rügen-Brücke, Usedom |
| 16 | Mi 12.08. | Polnische Ostsee (Misdroy) | 0 | Tagesausflüge |
| 17 | Do 13.08. | Świnoujście → Zempin | 25 | Grenzübergang auf Usedom |
| 18–25 | Fr 14.08.–Fr 21.08. | **Usedom** | 0 | 8 Tage, Camping am Dünengelände |
| 26 | Sa 22.08. | Usedom → Werbellinsee | 145 | Schwedt/Schorfheide, ~2,5 Std. |
| 27 | So 23.08. | Werbellinsee → Berlin | 80 | ~1,5 Std. |

### Anker-Punkte (Highlights)

- **Herzberg Festival** (30.07.–02.08., Breitenbach am Herzberg) — 4 Tage links-alternatives Musik-/Politik-Festival, Eröffnung der Reise
- **Torgau vertieft** (Tag 9 morgens) — Schloss Hartenfels mit "Schöner Pforte" (1525, erster evangelischer Kirchenbau), Stadtkirche St. Marien (Katharina von Boras Grab), Denkmal der Begegnung (Elbufer, Truman/Stalin 1945)
- **Wörlitzer Gartenreich** (Tag 9 nachmittags) — englischer Landschaftsgarten, Kahnfahrt möglich
- **Luigis Nonnevitz** (Tag 12–14) — Stellplatz am Rügener Weststrand mit Institution-Charakter
- **Usedom-Dünencamping** (Tag 18–25) — 8 Tage am Stück, polnische Seite billiger

### Stellplätze & Praktisches (Etappen-relevant)

- **Bad Hersfeld** (Geistalbad) — Tag 1, Pausenstop auf der 360-km-Anreise
- **Süßer Winkel am Werbellinsee** (Tag 26) — 30–35 €/Nacht
- **Torgau** (Tag 8/9) — Übernachtungsstop mit Vertiefungspotenzial
- **StVO §12/Landesrecht** — Wildcampen verboten, 1 Nacht zur Wiederherstellung der Fahrtüchtigkeit oft toleriert
- **Dérogation** (für ZAZ in Bremen-City + Paris) — bei Préfecture beantragen, ~2 Wochen Vorlauf

### Bezug zur Caravan-Sommer-2026-DB

Die Caravan-DB (1816 Orte, `orte.jsonl`) ist **kein** Ersatz für die konkrete Ostsee-Tour, sondern **das Lager**, aus dem spontane Stop-Entscheidungen fallen können:

- Auf der Route liegen mehrere Einträge: Genossenschaften, Höfe, Wagenplätze (overpass-Tag `community_centre`, `social_facility`)
- `orte-filter.html` client-side, lädt offline — wenn unterwegs ohne Netz, geht das auf
- Tipp: Für die Usedom-Woche (Tag 18–25) ggf. Solawi-Höfe in Vorpommern rausfiltern, falls Langeweile aufkommt

### Offene To-Dos (bis 28.07.)

- **CityKamp Paris** Reservierung (Tag 17, 75016) — schnell, max. 2,75 m Höhe prüfen
- **Louvre-Buchung** (für 04.08. — Wait, Tag 8 ist Torgau, Louvre ist in Paris = Tag 17?) — klären
- **Dérogation** für Bremen (ZAZ) + Paris beantragen
- **ADAC Euro-Schutzbrief** abschließen (für Polen/Frankreich)
- **Working-Notes-Ostsee-Tour-Karte** testen — Markus hat 26.07. bestätigt: grüne Linie sichtbar, 8 Stellplätze da

## Cross-References

- → [[music-culture]] — Road-Trip-Playlists für Protest-Demos
- → [[openclaw-community]] — Memory-Index für Reise-Briefings
- → [[cloud-kubernetes]] — Infrastruktur-Mentalität (Mobile-Operations, GitOps)
- → [[web-development]] — Working-Notes Deployment Pipeline (Leaflet-Karte, IONOS)
