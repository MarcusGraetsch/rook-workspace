# digital-capitalism-research

> Research project: Digital Capitalism, Platform Economy, Marxist Theory + Tech.
> Public repository. Akademischer Standard.

## Stack
- Writing: Markdown, Pandoc
- Code: Python 3.10+ (Datenanalyse)
- Notebooks: Jupyter
- Zitate: Zotero, BibTeX

## Build/Test
```bash
markdownlint "**/*.md"
python3 -m py_compile src/**/*.py
ruff check src/
```

## Konventionen
- Markdown: Klare Hierarchie, konsistente Formatierung
- Zitate: Inline-Citations, Fußnoten
- Python: Type-Hints, Docstrings
- Daten: Quellen dokumentieren
- Sprache: Deutsch oder Englisch — konsistent pro Dokument

## Off-Limits
- data/personal/ — Keine persönlichen Daten
- references/private/ — Private Korrespondenz
- docs/drafts/ — Nur mit DRAFT-Hinweis

## Beispiel-Datei
docs/papers/platform-capitalism-thesis.md

## Quality
- Faktencheck: Jede Behauptung mit Quelle
- Keine Halluzinationen: KI-Analyse verifizieren
- Akademischer Standard: Korrekte Zitation
