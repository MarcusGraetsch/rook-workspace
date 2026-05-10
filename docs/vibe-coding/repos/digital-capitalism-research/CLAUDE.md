# digital-capitalism-research

> Research project: Digital Capitalism, Platform Economy, Marxist Theory + Tech.
> Public repository. Akademischer Standard. Quellen verifizieren.

## Stack
- **Writing:** Markdown, Pandoc (für PDF/LaTeX-Export)
- **Code:** Python 3.10+ (Datenanalyse, Scraping, NLP)
- **Notebooks:** Jupyter (für explorative Analyse)
- **Zitate:** Zotero-Integration, BibTeX
- **Diagramme:** Mermaid, PlantUML

## Build/Test
```bash
# Markdown validieren
markdownlint "**/*.md"

# Python validieren
python3 -m py_compile src/**/*.py
ruff check src/

# Jupyter-Notebooks aufräumen
nbstripout notebooks/*.ipynb
```

## Konventionen
- **Markdown:** Klare Hierarchie (H1-Kapitel, H2-Sektionen, H3-Untersektionen)
- **Zitate:** Inline-Citations, Fußnoten, Bibliographie am Ende
- **Python:** Type-Hints, Docstrings, keine Halluzinationen in Analyse-Ergebnissen
- **Daten:** Quellen dokumentieren, Methoden transparent beschreiben
- **Sprache:** Deutsch oder Englisch — konsistent pro Dokument

## Folder Structure
```
docs/              # Forschungsdokumente, Papers
src/               # Python-Scripts, Analyse-Tools
notebooks/         # Jupyter-Notebooks (explorativ)
data/              # Rohdaten (nur öffentlich verfügbare!)
references/        # Bibliographie, Zotero-Export
```

## Off-Limits
- `data/personal/` — Keine persönlichen Daten
- `references/private/` — Private Korrespondenz, unveröffentlichte Quellen
- `docs/drafts/` — Unfertige Drafts nur mit "DRAFT"-Hinweis

## Beispiel-Datei (Markdown-Stil)
Siehe: `docs/papers/platform-capitalism-thesis.md`

## Quality
- Faktencheck: Jede Behauptung mit Quelle belegen
- Keine Halluzinationen: KI-generierte Analyse immer verifizieren
- Akademischer Standard: Korrekte Zitation, keine Fiktion als Fakt
- Peer-Review: Wichtige Arbeiten vor Publikation reviewen lassen

## Publishing
- Blog-Posts: `docs/blog/`, Jekyll-kompatibel
- Papers: `docs/papers/`, Pandoc + LaTeX
- Daten-Storys: Jupyter-Notebooks + Binder
