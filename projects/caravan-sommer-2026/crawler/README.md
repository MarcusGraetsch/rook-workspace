# Caravan-Sommer-2026 Initiative-Crawler

Phase-2-Crawler für die Alternative-Urlaub-Datenbank. Roh-Pipeline — kein
Polish, kein Master-Schema-Mapping. Ziel: Initiativen aus mehreren Quellen
extrahieren und in `datenbank/initiative-archiv/<quelle>/` als JSONL
ablegen.

## Setup

Venv wird vom bestehenden Crawler geteilt (siehe
`/root/.openclaw/workspace/data/crawler/README.md`):

```bash
. /root/.openclaw/workspace/data/crawler/crawlee_venv/bin/activate
```

## Verwendung

```bash
# Nur contraste.org (Kleinanzeigen + Termine)
python3 initiative_crawl.py --source contraste

# Nur kontrapolis.info
python3 initiative_crawl.py --source kontrapolis --max-requests 30

# Beide Quellen
python3 initiative_crawl.py --source all
```

## Quellen

| Quelle | Status | Output | Notizen |
|--------|--------|--------|---------|
| contraste.org (Kleinanzeigen + Termine) | ✅ funktional | `initiative-archiv/contraste/` | Initiativen + Events, anarch./basisdem., AT/DE/CH-Schwerpunkt |
| kontrapolis.info | ✅ funktional | `initiative-archiv/kontrapolis/` | Thematische Artikel (Berlin), 4/45 mit Initiativen-Bezug |

## Output-Schema

Siehe `datenbank/initiative-archiv/SCHEMA.md`. Eine JSON-Zeile pro Eintrag.

**Wichtig:** Das Schema hier ist **breiter** als das Master-Schema in
`datenbank/schema.md`. Crawler-Output ist heterogen und enthält
thematische Artikel (Kontrapolis) genauso wie ortsbezogene Initiativen
(contraste). Mapping auf Master-Schema + Deduplizierung passiert in
einem separaten Merge-Schritt.

## Bekannte Bugs / Limitierungen

Siehe `datenbank/initiative-archiv/REPORT.md` für volle Liste. Kurzfassung:

- **contraste.org-Kleinanzeigen**: Heuristik für Type-Erkennung (Solawi,
  Ökodorf, Kommune etc.) ist Keyword-basiert — false positives möglich.
- **Region-Detection** funktioniert nur für DACH-Standardorte. Andere
  Länder (FR, NL, etc.) fallen durch.
- **Event-Date-Parsing** für termine ist deaktiviert (zu unzuverlässig
  in erster Iteration). Platzhalter `None`.
- **Kontrapolis** liefert nur 4/45 Artikeln mit Initiativen-Bezug.
  Brauchbar als Hintergrundmaterial, nicht als primäre Initiative-Quelle.

## Erweiterung

Neue Quelle hinzufügen:

1. In `SOURCES`-Dict: Start-URLs, Output-Verzeichnis, SSL-Settings.
2. In `crawl_<source>()`: eigener Crawler-Pfad mit Parser.
3. In `extract_<source>_<subpage>()`: HTML-Parser.
4. Test mit `--source <new>`.

Konvention: Output immer nach
`datenbank/initiative-archiv/<quelle>/<quelle>_initiativen.jsonl`.