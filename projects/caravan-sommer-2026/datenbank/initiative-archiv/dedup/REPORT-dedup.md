# Deduplizierungs-Report — Caravan-Sommer-2026

**Datum:** 2026-07-05  
**Methode:** URL-Dedup + normalisierter (Name, Ort)-Match  
**Input:** 1188 Einträge aus 8 Crawler-Dateien  
**Output:** 1024 Initiativen + 129 Artikel  

## 1. Phasen

| Phase | Initiativen | Artikel |
|---|---|---|
| Roh geladen | 1059 | 129 |
| Nach URL-Dedup (intra-Datei) | 1030 | 129 |
| Nach Cross-Dedup (Name+Ort) | **1024** | 129 |
| **Reduktion Initiativen** | **35 Einträge** (3.3%) | – |

## 2. Cross-Cluster (Initiativen in ≥2 Quellen)

Es gibt **6 Cluster** mit Mehrfach-Treffern:

| Name | Stadt | Land | Treffer | Dateien |
|---|---|---|---|---|
| Wohnungsgenossenschaft Lübsche Höfe.eG | Lübeck | DE | 2 | wohnprojekte-portal |
| RaumHaus eG | Springe | DE | 2 | wohnprojekte-portal |
| Nils - Wohnen im Quartier | Kaiserslautern | DE | 2 | wohnprojekte-portal |
| Neues Wohnen Thyrsusstraße | Trier | DE | 2 | wohnprojekte-portal |
| vielleben Erndtebrück | Erndtebrück | DE | 2 | wohnprojekte-portal |
| HAUS DER HORIZONTE | Freiburg / Elbe | DE | 2 | wohnprojekte-portal |

## 3. Initiativen pro Datei (nach Cross-Dedup)

| Datei | Initiativen |
|---|---|
| `wohnprojekte-portal` | 771 |
| `workaway` | 200 |
| `netzwerk-oekodorf` | 25 |
| `contraste` | 21 |
| `gen-europe` | 13 |

## 4. Verteilung nach Land

| Land | Initiativen |
|---|---|
| DE | 799 |
| Spain | 36 |
| Italy | 35 |
| France | 29 |
| Germany | 20 |
| Portugal | 14 |
| Ireland | 13 |
| AT | 8 |
| Austria | 7 |
| Norway | 7 |
| Turkey | 6 |
| Sweden | 6 |
| Greece | 6 |
| Denmark | 4 |
| Belgium | 4 |
| Georgia | 2 |
| Switzerland | 2 |
| Netherlands | 1 |
| Croatia | 1 |
| Albania | 1 |
| Iceland | 1 |
| Hungary | 1 |
| Bulgaria | 1 |
| Lithuania | 1 |
| Czech Republic | 1 |
| Poland | 1 |
| UA | 1 |
| RU | 1 |
| FI | 1 |
| BE | 1 |

## 5. Verteilung nach Charakter

| Charakter | Initiativen |
|---|---|
| gemeinschaftlich | 705 |
| pragmatisch | 180 |
| basisdemokratisch | 27 |
| Mehrgenerationen | 25 |
| anarchistisch/basisdemokratisch | 21 |
| sozial | 18 |
| spirituell | 16 |
| ökologisch-gemeinschaftlich | 14 |
| ökologisch | 10 |
| christlich-spirituell | 8 |

## 6. Methodik

**Klassen-Trennung:** Einträge mit Type in {Kontrapolis-Artikel, Squat-Artikel, Hausprojekt-Artikel, Wagenplatz-Artikel} sind Hintergrund-Material. Sie werden nicht mit Initiativen dedupliziert.

**URL-Dedup:** Innerhalb jeder Datei: identische `source_url` → ein Eintrag, der reichhaltigste bleibt.

**Cross-Dedup:** Initiativen werden über normalisierten Key `(name, ort)` zusammengeführt. `ort` = city falls vorhanden, sonst region, sonst country. Match-Threshold: exakte Gleichheit nach Normalisierung (lowercase, accent-strip, punct-strip).

**Was NICHT gemacht wurde:** GPS-Anreicherung, Type-Mapping aufs Master-Schema, manuelles Kuratieren. Das ist Handarbeit / OSM und bleibt ein zweiter Schritt.

## 7. Dateien

- `initiativen.jsonl` — deduplizierte Initiativen, ein Eintrag pro einzigartigem Ort
- `artikel.jsonl` — Hintergrund-Artikel, dedupliziert nach URL
- `clusters.jsonl` — Audit: alle Cross-Quelle-Cluster mit Quell-URLs
- `REPORT-dedup.md` — diese Datei

## 8. Cross-Reference: Städte mit Initiativen + Artikel-Geschichte

**Wofür?** Orte, an denen es heute Initiativen gibt UND die historisch in
Squat/Wagenplatz-Berichten auftauchen — oft die spannendsten Reise-Standorte,
weil dort Subkultur-Tiefe + aktive Orte zusammentreffen.

| Stadt | Land | Initiativen | Artikel | Artikel-Typen |
|---|---|---|---|---|
| Berlin | DE | 17 | 29 | Hausprojekt-Artikel, Kontrapolis-Artikel (thematisch), Squat-Artikel (initiativen-bezogen), Wagenplatz-Artikel |
| Hamburg | DE | 6 | 10 | Kontrapolis-Artikel (thematisch), Squat-Artikel (initiativen-bezogen) |
| Wien | DE | 2 | 9 | Hausprojekt-Artikel, Squat-Artikel (initiativen-bezogen), Wagenplatz-Artikel |
| Regensburg | DE | 2 | 1 | Kontrapolis-Artikel (thematisch) |
| Homberg | DE | 1 | 1 | Wagenplatz-Artikel |