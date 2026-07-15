#!/usr/bin/env python3
"""Generate Dérogation-Quick-Ref PDF for Marcus' France trip."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUT = "/root/.openclaw/workspace/projects/caravan-sommer-2026/derogation-quick-ref.pdf"

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=15*mm, rightMargin=15*mm,
                        topMargin=15*mm, bottomMargin=15*mm)

styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, spaceAfter=8, textColor=HexColor('#1a1a1a'))
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, spaceAfter=4, spaceBefore=8, textColor=HexColor('#d97706'))
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=11, spaceAfter=2, spaceBefore=6, textColor=HexColor('#1a1a1a'))
P = ParagraphStyle('P', parent=styles['BodyText'], fontSize=8.5, leading=11, spaceAfter=2)
PS = ParagraphStyle('PS', parent=P, fontSize=7.5, leading=9, textColor=HexColor('#6b6b6b'))
PB = ParagraphStyle('PB', parent=P, fontSize=8.5, leading=11, fontName='Helvetica-Bold', textColor=HexColor('#d97706'))

story = []

# ===== HEADER =====
story.append(Paragraph("🇫🇷 Dérogation-Quick-Ref — France 2026", H1))
story.append(Paragraph("Für Hymer Ducato 1985 (H-Kennzeichen, Diesel, 3,2t zGG, 2,75m hoch)", P))
story.append(Paragraph("Crit'Air-Sticker <b>nicht möglich</b> für 1985er Diesel → stattdessen <b>Dérogation pro ZFE</b> beantragen", PS))
story.append(Spacer(1, 4))

# ===== DEINE SITUATION =====
story.append(Paragraph("✅ DEINE SITUATION", H2))
story.append(Paragraph("• <b>Wohnmobil (VASP)</b> in FR → Dérogation in den meisten ZFE", P))
story.append(Paragraph("• <b>H-Kennzeichen</b> (Oldtimer) → carte grise collection-Äquivalent → Dérogation in den meisten ZFE", P))
story.append(Paragraph("• <b>Doppelte Befreiung</b> — fast überall", P))
story.append(Paragraph("• <b>Online beantragen</b> in 5 Min, deutsch möglich, kostenlos", P))
story.append(Spacer(1, 4))

# ===== DEINE ROUTE =====
story.append(Paragraph("🗺️ DEINE ROUTE 28.07. – 23.08.2026", H2))
story.append(Paragraph("Bremen → Reims → Saint-Jean-le-Blanc (Calvados, ASF) → D-Day-Tour → Bretagne → Calais/Grande-Synthe → Paris (CityKamp) → Berlin", P))
story.append(Spacer(1, 4))

# ===== ZFE-PORTALE =====
story.append(Paragraph("🛡️ ZFE-DÉROGATION-PORTALE (die du brauchst)", H2))

portal_data = [
    ["ZFE / Stadt", "Portal-URL", "Was du bekommst", "Vorlauf"],
    ["Reims (Grand Reims)", "grandreims.fr", "Dérogation VASP (Wohnmobil)", "Vor Hinweg 1-2 Tage"],
    ["Grand Paris", "derogation-zfe.metropolegrandparis.fr", "Pass ZFE 24h oder Dauer-Dérogation", "Vor Paris 1-2 Tage"],
    ["Straßburg (Notfall)", "derogations-zfe.strasbourg.eu", "3-Jahres-Dauergenehmigung H-Kennzeichen", "Optional"],
    ["Lyon (Notfall)", "demarches.toodego.com", "Dérogation VASP/Collection", "Nur wenn über Lyon"],
    ["Grenoble (Notfall)", "demarches.toodego.com", "Dérogation VASP", "Nur wenn über Grenoble"],
    ["Toulouse (Notfall)", "métropole-toulouse.fr", "Dérogation VASP", "Nur wenn über Toulouse"],
    ["Rouen/Montpellier/Reims/Marseille (Notfall)", "jeweils métropole-Portal", "Dérogation VASP", "Nur falls du vorbeikommst"],
]

t = Table(portal_data, colWidths=[36*mm, 55*mm, 50*mm, 28*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#d97706')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 7),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('GRID', (0, 0), (-1, -1), 0.3, HexColor('#cccccc')),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
story.append(t)
story.append(Spacer(1, 4))

# ===== SCHRITT FÜR SCHRITT =====
story.append(Paragraph("📋 SO BEANTRAGST DU DÉROGATION (5 Min pro ZFE)", H2))
steps = [
    "<b>1.</b> Portal-URL oben öffnen",
    "<b>2.</b> Account erstellen (E-Mail + Passwort, geht auf Deutsch)",
    "<b>3.</b> Fahrzeug registrieren: Marke, Modell, Kennzeichen, <b>Erstzulassung 07.08.1985</b>",
    "<b>4.</b> Foto/Scan Zulassungsbescheinigung Teil 1 hochladen",
    "<b>5.</b> Dérogation-Art w&auml;hlen: <b>&bdquo;VASP&ldquo; (Wohnmobil)</b> oder <b>&bdquo;v&eacute;hicule de collection&ldquo; (Oldtimer)</b>",
    "<b>6.</b> Zeitraum wählen (z.B. 31.07.-02.08. für ASF-Zeit, 17.-19.08. für Paris)",
    "<b>7.</b> Bestätigung per E-Mail kommt sofort, Pass/PDF runterladen",
    "<b>8.</b> Ausdrucken + digital speichern → bei Kontrolle vorzeigen",
]
for s in steps:
    story.append(Paragraph(s, P))
story.append(Spacer(1, 4))

# ===== BEI KONTROLLE =====
story.append(Paragraph("🚨 WENN POLIZEI KONTROLLIERT", H2))
story.append(Paragraph("<b>Ruhe bleiben</b>, freundlich, Dokumente zeigen:", PB))
docs = [
    "Zulassungsbescheinigung Teil 1 (H-Kennzeichen sichtbar)",
    "Zulassungsbescheinigung Teil 2 (Fahrzeugbrief, optional)",
    "Dérogation-Bestätigung als PDF + ausgedruckt",
    "Personalausweis",
    "Optional: FFVE-/Oldtimer-Club-Ausweis (DE: AvD/ADAC Oldtimer)",
]
for d in docs:
    story.append(Paragraph(f"• {d}", P))

story.append(Spacer(1, 2))
story.append(Paragraph("<b>Französisch-Sätze, die helfen:</b>", P))
phrases_kontrolle = [
    "&bdquo;Bonjour, je suis un v&eacute;hicule de collection avec le certificat d&rsquo;immatriculation H (Allemagne).&ldquo; — Hallo, ich bin ein Oldtimer mit H-Kennzeichen (Deutschland).",
    "&bdquo;Mon v&eacute;hicule est un camping-car, VASP.&ldquo; — Mein Fahrzeug ist ein Wohnmobil.",
    "&bdquo;Je n&rsquo;ai pas pu obtenir la vignette Crit&rsquo;Air, mon v&eacute;hicule est trop ancien.&ldquo; — Ich konnte keine Crit&rsquo;Air-Vignette bekommen, mein Fahrzeug ist zu alt.",
    "&bdquo;Voici ma d&eacute;rogation ZFE.&ldquo; — Hier ist meine ZFE-Dérogation.",
    "&bdquo;Je peux montrer le document en allemand.&ldquo; — Ich kann das Dokument auf Deutsch zeigen.",
]
for ph in phrases_kontrolle:
    story.append(Paragraph(f"• {ph}", PS))
story.append(Spacer(1, 4))

# ===== STRAFE =====
story.append(Paragraph("💸 STRAFEN (falls erwischt ohne Dérogation)", H2))
story.append(Paragraph("• Crit'Air-Sticker fehlt in ZFE: <b>68-135 €</b>", P))
story.append(Paragraph("• Wohnmobil > 3,5t in ZFE: <b>135 €</b> (bei dir nicht der Fall)", P))
story.append(Paragraph("• Realistisch: Mit Dérogation = 0 €", P))
story.append(Spacer(1, 4))

# ===== MUT ZUM WOHNMOBIL =====
story.append(Paragraph("💡 PRAXIS-TIPPS", H2))
tips = [
    "<b>Ländliche Gebiete (90% deiner Reise):</b> keine ZFE, keine Dérogation nötig",
    "<b>Nur Großstädte</b> haben ZFE: Paris, Lyon, Marseille, Straßburg, Toulouse, Grenoble, Rouen, Montpellier, Reims, Saint-Étienne, Nice, Toulon",
    "<b>Notfall-Plan:</b> 24H-Pass pro ZFE (auch ohne H-Kennzeichen, bis 24 Tage/Jahr)",
    "<b>Bei Funkkontakt-Kameras</b> (Straßburg, Paris): Kennzeichen wird gelesen, Dérogation muss VORHER im System sein",
    "<b>Buchen am Vorabend</b> reicht meist (online 5 Min)",
    "<b>Buchen am Vormittag</b> ist sicherer (manche Portale brauchen 1-2h zur Bestätigung)",
]
for t_text in tips:
    story.append(Paragraph(f"• {t_text}", P))
story.append(Spacer(1, 4))

# ===== MITZUFÜHRENDE DOKUMENTE =====
story.append(Paragraph("📁 CHECKLISTE: IM WOHNMOBIL DABEI", H2))
checklist = [
    "Personalausweis",
    "Führerschein (Klasse B ausreichend bei 3,2t)",
    "Zulassungsbescheinigung Teil 1 + 2 (Original)",
    "H-Kennzeichen-Bescheinigung (vom TÜV bei H-Vergabe)",
    "Grüne Versicherungskarte",
    "ADAC-Mitgliedskarte + Euro-Schutzbrief",
    "Dérogation-Bestätigungen (ausgedruckt)",
    "Louvre-Tickets (digital + ausgedruckt)",
    "CityKamp-Reservierung (ausgedruckt)",
    "Optional: AvD-/Oldtimer-Club-Mitgliedschaft",
]
for c in checklist:
    story.append(Paragraph(f"☐ {c}", P))
story.append(Spacer(1, 4))

# ===== KONTAKTE =====
story.append(Paragraph("📞 WICHTIGE NUMMERN", H2))
nums = [
    "Notruf Europa: <b>112</b>",
    "ADAC-Pannenhilfe: +49 89 22 22 22 (oder via ADAC-App)",
    "AvD-Pannenhilfe: +49 69 66 06 30 30",
    "Französische Polizei: <b>17</b>",
    "Feuerwehr: <b>18</b>",
    "Rettungsdienst: <b>15</b>",
]
for n in nums:
    story.append(Paragraph(f"• {n}", P))
story.append(Spacer(1, 4))

story.append(Paragraph("🛡️ <b>FFVE-Hinweis:</b> FFVE akzeptiert keine Privatpersonen, nur Clubs/Profis. Stattdessen AvD oder ADAC-Mitgliedschaft.", PS))
story.append(Paragraph("📋 <b>Stand:</b> 2026-07-07 · Erstellt von Rook (Caravan-Sommer-2026) · Vor Reisebeginn 28.07.", PS))

doc.build(story)
print(f"PDF: {OUT}")

import os
size_kb = os.path.getsize(OUT) / 1024
print(f"Size: {size_kb:.1f} KB")
