# Recherche-Plan

**Stand:** 2026-06-25

## Ziele

1. **Sofort (diese Woche):** 50–100 Seed-Einträge aus den Tier-1-Quellen.
2. **Mittelfristig (4 Wochen):** 500+ Einträge, alle Tier-1-Quellen + erste Tier-2.
3. **Langfristig:** 1000+ Einträge, App-fertige Datenqualität.

## Tier-1-Quellen — Detailplan

### 0. Stellplätze, Camping, Freistehen ⭐ NEU (essentiell!)
- **park4night** (App + Web, EU-weit, kostenlose Basis, Premium ~€10/J)
  - User-generated Spots mit GPS, Bewertungen, Kommentaren
  - Filtern nach: kostenlos, Freistehen, mit Strom, 24h, etc.
  - Für Deutschland, Frankreich, Spanien, Italien besonders dicht
  - Web: https://park4night.com/
- **Stellplatz.info** (DE-spezifisch, sehr umfangreich, kostenlos)
  - Über 5.000 Stellplätze in DE
  - Filter: kostenlos, Ver-/Entsorgung, 24h, etc.
  - Web: https://www.stellplatz.info/
- **Landvergnügen** (Mitgliedschaft ~€30/J, Bauernhof-Camping)
  - ~2.500 landwirtschaftliche Betriebe in DE/AT/CH/IT
  - Oft sehr idyllisch, günstig (Mitgliedschaft lohnt sich bei >5 Aufenthalten)
  - Web: https://www.landvergnuegen.com/
- **ACSI** (Camping Card + Stellplatz-Führer, ~€40/J für Rabatt-Karte)
  - 9.000+ Campingplätze EU-weit, deutliche Rabatte außerhalb Hochsaison
  - Web: https://www.acsi.eu/
- **promobil Stellplatz-Atlas** (Print-Buch, gute Offline-Referenz)
- **Regionale Freisteh-Listen** (per Land):
  - DE: Schwarzwald, Bayerischer Wald, Allgäu → oft toleriert
  - FR: Aires de services (offizielle kostenlose Plätze!), Bretagne/Normandie sehr gut ausgebaut
  - ES: Parkplatz-Toleranz variiert
  - IT: oft Wildcamping in abgelegenen Regionen toleriert
- **Rechtliches (DE):**
  - StVO §12 (Halten/Parken), §31 (OWi)
  - Grundsätzlich: Wildcampen verboten, aber 1 Nacht zur Wiederherstellung der Fahrtüchtigkeit oft toleriert
  - Landesrecht variiert (Bayern strenger, NRW liberaler)
  - Wichtig: nicht auf Privatgrund ohne Erlaubnis, nicht in NSG, nicht länger als 1 Nacht

### 1. contraste PDF-Archiv ⭐
- **URL:** https://www.contraste.org/pdf-archiv/
- **Reichweite:** 1984–2024 (Archiv 481 = Okt 2024), ab da aktuelle Ausgaben online
- **Methode:**
  - Aktuelle Ausgabe direkt im Browser durchsuchen (Schlagworte: Adresse, Projekt, Hof, Werkstatt, Kommune, Wwoof)
  - Ältere Ausgaben: PDF herunterladen, mit Adobe Reader Volltextsuche
  - Selektive Schlagwort-Listen je Ausgabe
- **Marcus-Erinnerung:** contraste ist **die** Quelle für Adressen deutschsprachiger Projekte
- **Aufwand:** Hoch (40+ Jahrgänge), aber beste Datenqualität für DE
- **Sub-Strategie:** Fokus auf letzte 10 Jahre (realistisch + Adressen aktuell), ältere Ausgaben nur bei bekannten Projekten

### 2. GEN Europe Ecovillage Directory
- **URL:** https://gen-europe.org/ecovillage-and-network-directory/
- **Methode:** Directory durchblättern, alle Einträge systematisch aufnehmen
- **Aufwand:** Mittel (vermutlich 100–300 Einträge)
- **Reichweite:** Europa, alle Ökodörfer die GEN-Mitglied sind
- **Bonus:** Network-Verweise (Partner-Ökodörfer, Transition-Town-Netzwerke)

### 3. Wwoofing national
- **DE:** https://www.wwoof.de/ (Mitgliedschaft erforderlich für Liste)
- **UK:** https://wwoof.org.uk/
- **FR:** https://www.wwoof.fr/
- **NL:** https://www.wwoof.nl/
- **Methode:** Mitgliedschaft prüfen — kostenlos? oder Mitgliedschaft ableiten?
- **Alternative:** Workaway + HelpX (offener)

### 4. Workaway / HelpX
- **Workaway:** https://www.workaway.info/ (offene Liste mit Filter)
- **HelpX:** https://www.helpx.net/
- **Methode:** Länder-Filter, Kategorien (farming, building, teaching, etc.)
- **Aufwand:** Hoch (10.000+ Hosts weltweit), gezielt nach Europa

## Tier-2-Quellen — Strategie

### 5. squat.net
- International, ~30 Länder mit Unterseiten
- Pro Land: Top-Liste der aktuellen Squats/Social-Centers

### 6. Wikipedia-Listen (systematisch)
- `List of intentional communities`
- `List of ecovillages`
- `List of social centres`
- `List of megalithic sites` (länderweise)
- `List of cooperative enterprises`
- `List of festivals` (alternative + politisch)

### 7. OpenStreetMap (Overpass API)
- Tags: `social_facility`, `amenity=community_centre`, `craft=carpenter`, `landuse=farmyard` mit `organic=yes`, `tourism=camp_site` mit Tags
- API: `https://overpass-api.de/api/interpreter`
- Bulk-Abfragen pro Region + Kategorie

### 8. Reparatur-Café-Map
- repaircafe.org Map-Funktion (DE stark vertreten, auch international)

### 9. Urgenci / CSA-Netzwerk
- Internationales Solawi/CSA-Netzwerk
- Europäische Mitglieder-Liste

## Tier-3 — Später

- Lokale/regionale Magazine und Verzeichnisse
- Persönliche Empfehlungen dokumentieren
- Spezial-Verzeichnisse (Föderation deutschsprachiger Ökodörfer, GEN-International, ICSA etc.)

## Arbeitsweise

### Manuell (Rook, jetzt)
- Quellen-URL identifizieren, Notiz in `quellen/<quelle>.md`
- Strukturierte Einträge in `orte.jsonl`
- Verifikations-Lücken markieren

### Subagent (später, für Massen-Recherche)
- **Cleanup-Context** (kein Transkript nötig)
- **Briefing:** „Recherchiere <Kategorie> in <Ländern>. Ziel: <N> Einträge mit Name, Adresse, GPS, URL, 1-Satz-Beschreibung, Quelle."
- **Output:** JSONL-Format, direkt in `orte.jsonl` appenden oder zur Review vorlegen
- **Quality-Bars:** Keine Einträge ohne Quelle, GPS wenn möglich

### Cron (langfristig)
- Tägliche Recherche-Pass (z.B. nachts) für eine Kategorie oder Region
- Inkrementelle Erweiterung
- Ergebnis in `recherche-log/<datum>.md`

## Recherche-Etappen (Vorschlag)

**Etappe 1 (KW 26, diese Woche):**
- contraste aktuelle Ausgaben + Archiv 481
- GEN Europe Directory (komplett)
- Wikipedia `List of ecovillages`
- **Ziel: 50 Einträge**

**Etappe 2 (KW 27):**
- Wwoof DE + Workaway DE-Sample (Top 50)
- Wikipedia `List of intentional communities`
- squat.net Deutschland + Frankreich
- **Ziel: 150 Einträge**

**Etappe 3 (KW 28):**
- Wwoof UK/FR/NL
- OpenStreetMap Overpass (social centres)
- Wikipedia-Megalith-Listen (DE, FR, UK, IE)
- **Ziel: 300 Einträge**

**Etappe 4 (KW 29):**
- Repair-Café-Map
- Urgenci CSA-Netzwerk
- Wikipedia Festivals
- Longo Mai, Christiania, ZAD-Beispiele
- **Ziel: 500 Einträge**

**Etappe 5 (KW 30, vor Reise):**
- Verifikation der Routen-relevanten Einträge
- OpenStreetMap-Cross-Check
- Lücken füllen
- App-Prototyp vorbereiten

## Erfolgsmetriken

- **Quantität:** Anzahl Einträge (kurzfristig: 100, mittelfristig: 500, langfristig: 1000+)
- **Qualität:** % verifizierter Einträge (Ziel: >50% bis Reisebeginn)
- **Abdeckung:** Einträge pro Tier-1-Land (DE, FR, NL, BE, DK, UK)
- **Konsistenz:** % Einträge mit GPS-Koordinaten
