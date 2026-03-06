#!/usr/bin/env python3
"""
Telegram PDF Handler for Literature Pipeline

Dieses Modul integriert die Literature Pipeline mit Telegram.
Es ermöglicht das Senden von PDFs via Telegram, die dann automatisch
verarbeitet und zusammengefasst werden.

Workflow:
    1. PDF wird via Telegram empfangen
    2. PDF wird in inbox/ gespeichert
    3. Pipeline wird gestartet (ingest → extract_text → extract_refs → extract_knowledge)
    4. Zusammenfassung wird generiert
    5. Ergebnis wird zurück an Telegram gesendet

Usage (internal):
    Wird automatisch von OpenClau aufgerufen wenn PDF via Telegram empfangen wird.
    Nicht für manuelle Ausführung gedacht.

Archive:
    PDFs werden nach Verarbeitung nach archive/ verschoben (für späteres RAG)
"""

import argparse
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Pipeline-Module importieren
from .db import get_connection, init_db, get_source_by_id
from .utils import setup_logging, logger


# Konstanten für Verzeichnisstruktur
PIPELINE_DIR = Path(__file__).parent
INBOX_DIR = PIPELINE_DIR / "inbox"
ARCHIVE_DIR = PIPELINE_DIR / "archive"
DB_PATH = PIPELINE_DIR / "literature.db"


def ensure_directories():
    """Stellt sicher, dass alle benötigten Verzeichnisse existieren."""
    INBOX_DIR.mkdir(exist_ok=True)
    ARCHIVE_DIR.mkdir(exist_ok=True)
    logger.info(f"Verzeichnisse geprüft: inbox={INBOX_DIR}, archive={ARCHIVE_DIR}")


def save_pdf_from_telegram(pdf_data: bytes, filename: str) -> Path:
    """
    Speichert ein PDF aus Telegram in den inbox-Ordner.
    
    Args:
        pdf_data: Binäre PDF-Daten
        filename: Original-Dateiname
        
    Returns:
        Path zum gespeicherten PDF
    """
    # Timestamp hinzufügen um Kollisionen zu vermeiden
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{filename}"
    
    pdf_path = INBOX_DIR / safe_filename
    pdf_path.write_bytes(pdf_data)
    
    logger.info(f"PDF gespeichert: {pdf_path} ({len(pdf_data)} bytes)")
    return pdf_path


def run_pipeline_on_pdf(pdf_path: Path) -> dict:
    """
    Führt die Literature Pipeline auf einem PDF aus.
    
    Args:
        pdf_path: Path zum PDF
        
    Returns:
        Dict mit Pipeline-Ergebnissen
    """
    logger.info(f"Starte Pipeline für: {pdf_path.name}")
    
    # Schritt 1: Ingest (Metadaten erfassen)
    logger.info("Schritt 1/4: Ingest...")
    result = subprocess.run([
        sys.executable, "-m", "literature_pipeline.ingest",
        "--file", str(pdf_path),
        "--title", pdf_path.stem,  # Temporärer Titel aus Filename
    ], capture_output=True, text=True, cwd=PIPELINE_DIR.parent)
    
    if result.returncode != 0:
        logger.error(f"Ingest fehlgeschlagen: {result.stderr}")
        raise RuntimeError(f"Ingest fehlgeschlagen: {result.stderr}")
    
    # Source ID aus Output extrahieren oder aus DB holen
    source_id = get_latest_source_id()
    logger.info(f"Source ID: {source_id}")
    
    # Schritt 2: Text extrahieren
    logger.info("Schritt 2/4: Text extrahieren...")
    subprocess.run([
        sys.executable, "-m", "literature_pipeline.extract_text",
        "--source-id", str(source_id)
    ], check=True, cwd=PIPELINE_DIR.parent)
    
    # Schritt 3: Referenzen extrahieren
    logger.info("Schritt 3/4: Referenzen extrahieren...")
    subprocess.run([
        sys.executable, "-m", "literature_pipeline.extract_refs",
        "--source-id", str(source_id)
    ], check=True, cwd=PIPELINE_DIR.parent)
    
    # Schritt 4: Knowledge Extraction (LLM)
    logger.info("Schritt 4/4: Knowledge Extraction...")
    subprocess.run([
        sys.executable, "-m", "literature_pipeline.extract_knowledge",
        "--source-id", str(source_id)
    ], check=True, cwd=PIPELINE_DIR.parent)
    
    logger.info("Pipeline abgeschlossen")
    return {"source_id": source_id, "pdf_path": pdf_path}


def get_latest_source_id() -> int:
    """Holt die zuletzt hinzugefügte Source ID aus der DB."""
    conn = get_connection()
    cursor = conn.execute("SELECT id FROM sources ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return row[0]
    raise RuntimeError("Keine Source in DB gefunden")


def generate_telegram_summary(source_id: int) -> str:
    """
    Generiert eine Telegram-freundliche Zusammenfassung.
    
    Format:
        - Titel + Autoren
        - Kurzzusammenfassung (Key Findings)
        - 3 Beispiel-Referenzen
        - Erste 3 BibTeX-Einträge
    """
    conn = get_connection()
    
    # Source-Metadaten holen
    cursor = conn.execute(
        "SELECT title, authors, year, abstract, key_findings FROM sources WHERE id = ?",
        (source_id,)
    )
    source = cursor.fetchone()
    
    if not source:
        conn.close()
        return "❌ Fehler: Source nicht in Datenbank gefunden"
    
    title, authors, year, abstract, key_findings = source
    
    # Referenzen holen (max 3)
    cursor = conn.execute(
        "SELECT raw_ref, authors, title FROM refs WHERE source_id = ? LIMIT 3",
        (source_id,)
    )
    refs = cursor.fetchall()
    
    # BibTeX-Einträge holen (max 3)
    cursor = conn.execute(
        "SELECT bibtex_entry FROM refs WHERE source_id = ? AND bibtex_entry IS NOT NULL LIMIT 3",
        (source_id,)
    )
    bibtex_entries = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    
    # Telegram-Nachricht zusammenbauen
    lines = []
    lines.append(f"📄 *{title}*")
    lines.append(f"👤 {authors or 'Unbekannt'} ({year or 'n.d.'})")
    lines.append("")
    
    # Zusammenfassung
    if key_findings:
        lines.append("📝 *Zusammenfassung:*")
        lines.append(key_findings[:800] + "..." if len(key_findings) > 800 else key_findings)
    elif abstract:
        lines.append("📝 *Abstract:*")
        lines.append(abstract[:800] + "..." if len(abstract) > 800 else abstract)
    else:
        lines.append("📝 *Keine Zusammenfassung verfügbar*")
    
    lines.append("")
    
    # Beispiel-Referenzen
    if refs:
        lines.append("📚 *Beispiel-Referenzen:*")
        for i, (raw_ref, ref_authors, ref_title) in enumerate(refs, 1):
            ref_text = ref_title or raw_ref[:100]
            lines.append(f"{i}. {ref_text}")
        lines.append("")
    
    # BibTeX-Einträge
    if bibtex_entries:
        lines.append("📖 *BibTeX (erste 3):*")
        lines.append("```bibtex")
        for entry in bibtex_entries:
            lines.append(entry[:300] + "..." if len(entry) > 300 else entry)
            lines.append("")
        lines.append("```")
    
    return "\n".join(lines)


def archive_pdf(pdf_path: Path, source_id: int) -> Path:
    """
    Archiviert das PDF für späteres RAG.
    
    Args:
        pdf_path: Original-PDF-Path
        source_id: ID in der Datenbank
        
    Returns:
        Neuer Path im Archiv
    """
    # Neue Dateiname mit Source-ID für einfache Zuordnung
    new_name = f"source_{source_id}_{pdf_path.name}"
    archive_path = ARCHIVE_DIR / new_name
    
    shutil.move(str(pdf_path), str(archive_path))
    logger.info(f"PDF archiviert: {archive_path}")
    
    return archive_path


def process_pdf_from_telegram(pdf_data: bytes, filename: str) -> str:
    """
    Hauptfunktion: Verarbeitet ein PDF aus Telegram und gibt Summary zurück.
    
    Dies ist der Entry-Point der von OpenClau aufgerufen wird.
    
    Args:
        pdf_data: Binäre PDF-Daten aus Telegram
        filename: Original-Dateiname
        
    Returns:
        Telegram-formatierte Zusammenfassung
    """
    setup_logging()
    ensure_directories()
    init_db()
    
    try:
        # 1. PDF speichern
        pdf_path = save_pdf_from_telegram(pdf_data, filename)
        
        # 2. Pipeline ausführen
        result = run_pipeline_on_pdf(pdf_path)
        source_id = result["source_id"]
        
        # 3. Zusammenfassung generieren
        summary = generate_telegram_summary(source_id)
        
        # 4. PDF archivieren (nicht löschen - für späteres RAG)
        archive_pdf(pdf_path, source_id)
        
        # 5. Erfolgs-Indikator hinzufügen
        summary = f"✅ *Verarbeitung abgeschlossen*\n\n{summary}"
        summary += f"\n\n💾 Archiviert als: source_{source_id}_..."
        
        return summary
        
    except Exception as e:
        logger.error(f"Fehler bei Verarbeitung: {e}")
        return f"❌ *Fehler bei Verarbeitung:*\n```\n{str(e)}\n```"


def main():
    """CLI-Entry-Point für manuelle Tests."""
    parser = argparse.ArgumentParser(
        description="Telegram Handler für Literature Pipeline"
    )
    parser.add_argument(
        "--test-file",
        type=Path,
        help="PDF-Datei für manuellen Test (nicfür Produktion)"
    )
    
    args = parser.parse_args()
    
    if args.test_file:
        # Manueller Test-Modus
        setup_logging()
        pdf_data = args.test_file.read_bytes()
        result = process_pdf_from_telegram(pdf_data, args.test_file.name)
        print(result)
    else:
        parser.print_help()
        print("\nHinweis: Dieses Script wird normalerweise von OpenClau aufgerufen,")
        print("nicht manuell. Für manuelle Tests: --test-file path/to.pdf")


if __name__ == "__main__":
    main()
