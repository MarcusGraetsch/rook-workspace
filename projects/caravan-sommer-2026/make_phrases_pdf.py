#!/usr/bin/env python3
"""Generate Französisch-Phrasen PDF for Marcus' France trip."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

OUT = "/root/.openclaw/workspace/projects/caravan-sommer-2026/franz-phrasen.pdf"

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=15*mm, rightMargin=15*mm,
                        topMargin=15*mm, bottomMargin=15*mm)

styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, spaceAfter=8, textColor=HexColor('#1a1a1a'))
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12, spaceAfter=3, spaceBefore=8, textColor=HexColor('#d97706'))
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=10, spaceAfter=2, spaceBefore=4, textColor=HexColor('#1a1a1a'))
P = ParagraphStyle('P', parent=styles['BodyText'], fontSize=8.5, leading=11, spaceAfter=2)
PS = ParagraphStyle('PS', parent=P, fontSize=7.5, leading=9, textColor=HexColor('#6b6b6b'))
PB = ParagraphStyle('PB', parent=P, fontSize=8.5, leading=11, fontName='Helvetica-Bold', textColor=HexColor('#d97706'))
PFR = ParagraphStyle('PFR', parent=P, fontSize=9, leading=11, fontName='Helvetica-Bold', textColor=HexColor('#1a40af'))
PDE = ParagraphStyle('PDE', parent=P, fontSize=8.5, leading=11, textColor=HexColor('#3a3a3a'))

story = []

# ===== HEADER =====
story.append(Paragraph("💬 Französisch-Phrasen für die Wohnmobil-Reise", H1))
story.append(Paragraph("Hymer Ducato 1985 H-Kennzeichen · 28.07.–23.08.2026 · Schwerpunkt: ZFE-Kontrolle, Camping, Bistro", P))
story.append(Spacer(1, 4))

# ===== ABSCHNITT 1: HÖFLICHKEIT =====
story.append(Paragraph("1. Höflichkeit & Smalltalk", H2))
data_1 = [
    ("Bonjour", "Hallo / Guten Tag"),
    ("Bonsoir", "Guten Abend"),
    ("Au revoir", "Auf Wiedersehen"),
    ("Merci / Merci beaucoup", "Danke / Vielen Dank"),
    ("S'il vous plaît", "Bitte"),
    ("Excusez-moi", "Entschuldigung / Darf ich mal…"),
    ("Pardon", "Entschuldigung"),
    ("Oui / Non", "Ja / Nein"),
    ("Je ne comprends pas", "Ich verstehe nicht"),
    ("Parlez-vous allemand/anglais?", "Sprechen Sie Deutsch/Englisch?"),
    ("Comment allez-vous?", "Wie geht es Ihnen?"),
    ("Ça va bien, merci", "Mir geht's gut, danke"),
]
for fr, de in data_1:
    story.append(Paragraph(f"<b>{fr}</b> &mdash; {de}", P))
story.append(Spacer(1, 3))

# ===== ABSCHNITT 2: ZFE-Kontrolle =====
story.append(Paragraph("2. ZFE-Kontrolle & Polizei", H2))
data_2 = [
    ("Bonjour, je suis un véhicule de collection avec le certificat d'immatriculation H (Allemagne).",
     "Hallo, ich bin ein Oldtimer mit H-Kennzeichen (Deutschland)."),
    ("Mon véhicule est un camping-car, VASP.",
     "Mein Fahrzeug ist ein Wohnmobil."),
    ("Je n'ai pas pu obtenir la vignette Crit'Air, mon véhicule est trop ancien.",
     "Ich konnte keine Crit'Air-Vignette bekommen, mein Fahrzeug ist zu alt."),
    ("Voici ma dérogation ZFE.",
     "Hier ist meine ZFE-Dérogation."),
    ("Voici mon certificat d'immatriculation.",
     "Hier ist meine Zulassungsbescheinigung."),
    ("Je peux montrer le document en allemand.",
     "Ich kann das Dokument auf Deutsch zeigen."),
    ("Je viens d'Allemagne, je suis en route pour / je reste à [ville].",
     "Ich komme aus Deutschland, ich fahre nach / bleibe in [Stadt]."),
    ("Avez-vous une question sur mon véhicule?",
     "Haben Sie eine Frage zu meinem Fahrzeug?"),
    ("Je n'ai rien à déclarer de plus.",
     "Ich habe nichts weiter zu erklären."),
    ("Merci, bonne journée.",
     "Danke, guten Tag."),
]
for fr, de in data_2:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 3))
# ===== ABSCHNITT 3: CAMPING =====
story.append(Paragraph("3. Camping / Aires / Wohnmobil-Stellplätze", H2))
data_3 = [
    ("Bonsoir, est-ce que vous avez un emplacement libre pour un camping-car?",
     "Guten Abend, haben Sie einen freien Stellplatz für ein Wohnmobil?"),
    ("Je voudrais rester [X] nuits.",
     "Ich möchte [X] Nächte bleiben."),
    ("C'est combien par nuit?",
     "Was kostet es pro Nacht?"),
    ("Y a-t-il de l'électricité et de l'eau?",
     "Gibt es Strom und Wasser?"),
    ("Où est la borne de vidange?",
     "Wo ist die Entsorgungsstation?"),
    ("L'addition, s'il vous plaît.",
     "Die Rechnung, bitte."),
    ("Je peux payer par carte?",
     "Kann ich mit Karte zahlen?"),
    ("Avez-vous un code wifi?",
     "Haben Sie einen WLAN-Code?"),
    ("À quelle heure est le départ?",
     "Wann ist die Abreise?"),
    ("Merci pour votre accueil.",
     "Danke für die Aufnahme."),
]
for fr, de in data_3:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 3))
# ===== ABSCHNITT 4: BISTRO / ESSEN =====
story.append(Paragraph("4. Bistro / Restaurant / Café", H2))
data_4 = [
    ("Bonjour, une table pour [X] personnes, s'il vous plaît.",
     "Hallo, einen Tisch für [X] Personen, bitte."),
    ("La carte, s'il vous plaît.",
     "Die Speisekarte, bitte."),
    ("Qu'est-ce que vous recommandez?",
     "Was empfehlen Sie?"),
    ("Je voudrais… / Je vais prendre…",
     "Ich möchte… / Ich nehme…"),
    ("Une carafe d'eau, s'il vous plaît.",
     "Eine Karaffe Wasser, bitte."),
    ("Un café / Un thé / Une bière pression",
     "Ein Kaffee / Ein Tee / Ein Bier vom Fass"),
    ("L'addition, s'il vous plaît.",
     "Die Rechnung, bitte."),
    ("C'était très bon, merci!",
     "Es war sehr gut, danke!"),
    ("Je suis végétarien / Je ne mange pas de porc.",
     "Ich bin Vegetarier / Ich esse kein Schwein."),
    ("Avez-vous un menu en anglais/allemand?",
     "Haben Sie eine Speisekarte auf Englisch/Deutsch?"),
]
for fr, de in data_4:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 3))
# ===== ABSCHNITT 5: TANKSTELLE / MAUT =====
story.append(Paragraph("5. Tankstelle / Maut", H2))
data_5 = [
    ("Fait le plein de gazole, s'il vous plaît.",
     "Volltanken mit Diesel, bitte."),
    ("C'est combien le litre?",
     "Was kostet der Liter?"),
    ("Où est la station-service la plus proche?",
     "Wo ist die nächste Tankstelle?"),
    ("Bonsoir, je voudrais une autorisation de télépéage.",
     "Guten Abend, ich möchte eine Télépéage-Genehmigung."),
    ("Je paye en espèces / par carte.",
     "Ich zahle bar / mit Karte."),
    ("Où est le péage?",
     "Wo ist die Mautstation?"),
    ("Pouvez-vous m'aider? Je ne comprends pas le système.",
     "Können Sie mir helfen? Ich verstehe das System nicht."),
]
for fr, de in data_5:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 3))
# ===== ABSCHNITT 6: WEGBESCHREIBUNG =====
story.append(Paragraph("6. Wegbeschreibung / Hilfe", H2))
data_6 = [
    ("Pardon, où sommes-nous?",
     "Entschuldigung, wo sind wir hier?"),
    ("Comment aller à [ville/adresse]?",
     "Wie komme ich nach [Stadt/Adresse]?"),
    ("C'est loin?",
     "Ist es weit?"),
    ("Y a-t-il une aire de camping-car près d'ici?",
     "Gibt es einen Wohnmobil-Stellplatz in der Nähe?"),
    ("Où est le centre-ville?",
     "Wo ist das Stadtzentrum?"),
    ("Où est l'office de tourisme?",
     "Wo ist das Tourismusbüro?"),
    ("Pouvez-vous m'écrire l'adresse?",
     "Können Sie mir die Adresse aufschreiben?"),
    ("Y a-t-il un supermarché / une boulangerie près d'ici?",
     "Gibt es einen Supermarkt / eine Bäckerei in der Nähe?"),
]
for fr, de in data_6:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 3))
# ===== ABSCHNITT 7: PANNE =====
story.append(Paragraph("7. Panne / ADAC-Hilfe", H2))
data_7 = [
    ("Mon véhicule est en panne.",
     "Mein Fahrzeug hat eine Panne."),
    ("Pouvez-vous m'aider? Mon camping-car ne démarre plus.",
     "Können Sie mir helfen? Mein Wohnmobil springt nicht mehr."),
    ("Je suis membre de l'ADAC, mon numéro est [X].",
     "Ich bin ADAC-Mitglied, meine Nummer ist [X]."),
    ("J'ai besoin d'un remorquage.",
     "Ich brauche einen Abschleppdienst."),
    ("Où est le garage le plus proche?",
     "Wo ist die nächste Werkstatt?"),
    ("Pouvez-vous appeler un dépanneur?",
     "Können Sie einen Pannenhelfer rufen?"),
    ("Il y a un feu orange / de la fumée.",
     "Es gibt eine Warnleuchte / Rauch."),
]
for fr, de in data_7:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 3))
# ===== ABSCHNITT 8: HUMANITÄR CALAIS =====
story.append(Paragraph("8. Calais / Grande-Synthe (humanitär)", H2))
data_8 = [
    ("Bonjour, je cherche [organisation].",
     "Hallo, ich suche [Organisation]."),
    ("Est-ce que je peux visiter le camp?",
     "Kann ich das Lager besuchen?"),
    ("J'aimerais faire un don.",
     "Ich möchte spenden."),
    ("De quoi avez-vous besoin?",
     "Was brauchen Sie?"),
    ("Je peux aider?",
     "Kann ich helfen?"),
    ("Je suis journaliste / écrivain / volontaire.",
     "Ich bin Journalist / Autor / Freiwilliger."),
    ("Je peux vous poser quelques questions?",
     "Darf ich Ihnen ein paar Fragen stellen?"),
]
for fr, de in data_8:
    story.append(Paragraph(f"<font color='#1a40af'><b>{fr}</b></font>", PFR))
    story.append(Paragraph(f"{de}", PDE))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 4))
# ===== AUSSPRACHE-HILFEN =====
story.append(Paragraph("9. Aussprache-Tipps", H2))
tips = [
    "Französisch wird <b>buchstabiert ausgesprochen</b>: 'ai' = 'ä', 'en' = nasal 'ang', 'oi' = 'oa', 'eu' = 'ö'",
    "Häufige Laute: <b>R</b> im Rachen rollen, <b>U</b> mit gerundeten Lippen, <b>é/er/ez</b> = geschlossenes 'ä'",
    "Höflichkeit: <b>immer 'Bonjour' zuerst</b> — auch im Supermarkt, auf dem Camping, beim Bäcker",
    "Singen hilft: <b>Resiste</b> von France Gall klingt wie gesprochenes Französisch, gut für Aussprache-Training",
    "Lächeln + langsam sprechen + zeigen hilft mehr als perfektes Französisch",
    "<b>Apps:</b> Google Translate (mit Kamera für Schilder), DeepL (besser als Google)",
]
for t_text in tips:
    story.append(Paragraph(f"• {t_text}", P))

story.append(Spacer(1, 4))
story.append(Paragraph("📋 <b>Stand:</b> 2026-07-07 · Erstellt von Rook (Caravan-Sommer-2026) · Aussprache in 3 Wochen üben!", PS))

doc.build(story)

import os
size_kb = os.path.getsize(OUT) / 1024
print(f"PDF: {OUT} ({size_kb:.1f} KB)")
