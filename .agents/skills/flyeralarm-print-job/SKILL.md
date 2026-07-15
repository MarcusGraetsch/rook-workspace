---
name: flyeralarm-print-job
description: Printfertige PDF/X-3 für FLYERALARM. KI-Upscaling, CMYK, Format-spezifische Specs aus Datenblättern. Hissflagge, Plane, Flyer, Plakat, Visitenkarte, Sticker.
status: pending-proposal
version: v2
date: 2026-06-30T20:35:27.605Z
proposal_id: flyeralarm-print-job-20260630-683200b813
note: Backup-Snapshot des pending Workshop-Vorschlags. Live-Apply war im Sandbox-Environment nicht möglich (no approval route). Bei zukünftigem Setup mit aktiviertem Approval-Pfad: skill_workshop action=apply mit der proposal_id aufrufen.
---

# flyeralarm-print-job

Printfertige PDF/X-3-Dateien für FLYERALARM-Produkte aus User-Bildern erstellen.

## Wann nutzen

Wenn der User ein FLYERALARM-Produkt bestellen will und:
- ein Bild/Motiv liefert (JPG/PNG/HEIC/SVG)
- eine FLYERALARM-Produkt-URL nennt
- und/oder ein Format + Größe angibt (z.B. „Hissflagge 2,5×1,5 m Querformat, Befestigung links")

## Scope (per Decision 2026-06-30)

- **Nur FLYERALARM** (keine anderen Druckereien wie viaprinto)
- **Konfektionierungs-Wissen NICHT einbauen** — FLYERALARM-Datenblätter werden on-demand geholt
- **Storage zentral** unter `~/.openclaw/print-tools/`, aber nach Job löschbar

---

## Storage-Layout

```
~/.openclaw/print-tools/
├── weights/
│   └── RealESRGAN_x4plus.pth          # ~64 MB (Real-ESRGAN x4 Modell)
├── profiles/
│   ├── ISOcoated_v2_300_eci.icc       # FOGRA39, Offset-Coated (Default)
│   ├── PSO_Coated_v3.icc              # FOGRA51/52, neuerer Standard
│   └── PSO_Uncoated_v3.icc            # FOGRA47, ungestrichen
└── cache/
    └── datasheets/                     # gecachte FLYERALARM-Datenblätter
```

**Cleanup-Empfehlung nach Job:** `rm -rf ~/.openclaw/print-tools/` wenn User bestätigt dass keine weiteren Print-Jobs anstehen.

---

## FLYERALARM-Produktkategorien (Vollständige Übersicht)

Quelle: `World-of-FLYERALARM_Katalog.pdf` (Stand 2026).

### Druckprodukte (`/de/c/druckprodukte/`)

| Produkt | Hinweise |
|---|---|
| **Flyer** (S. 28) | Einzel-Flyer, gefalzt, viele Formate (A6, A5, A4, DL), Hoch- und Querformat. Kleinste Beschnittzugaben (oft 1-3 mm). |
| **Faltblätter** | 4-6-seitig, gefalzt, Wickel-/Zickzack-Falz |
| **Broschüren** (S. 42) | Mehrseitige Broschüren mit Klammerheftung oder Klebebindung |
| **Magazine** | Hochwertige Mehrseiter, oft Klebebindung |
| **Plakate** | Citylight, A2/A1/A0, oft 4-farbig Skala. Großformat-DPI (100-150). |
| **Postkarten** | A6 (Standard), Sonderformate, Hochglanz- oder matt-Karton |
| **Visitenkarten** (S. 74) | Standard 85×55 mm, Sonderformate. Kleine Beschnittzugaben (oft 3 mm). |
| **Aufkleber / Sticker** (`/de/c/druckprodukte/aufkleber/`) | Einzelsticker, Bogen-Sticker, Kontursticker, verschiedene Materialien |
| **Etiketten** | Bogenetiketten, Rollenetiketten, Sonderformen |
| **Kalender** | Wandkalender, Tischkalender |
| **Bücher** | Hardcover, Softcover |
| **Briefpapier / Briefumschläge** | Geschäftsausstattung |
| **Verpackungen** | Faltschachteln, Versandtaschen |
| **Hefte / Blöcke** | Mit Klebebindung |

### Werbetechnik (`/de/c/werbetechnik/`)

| Produkt | URL-Pattern für Datenblatt | Hinweise |
|---|---|---|
| **Hissflagge Querformat** | `hissfl_q_{w}x{h}.pdf` | Befestigung links/rechts wählbar, Datei-Ausrichtung entsprechend |
| **Hissflagge Hochformat mit Doppelausleger** | `hissfl_bs_2ausl_{w}x{h}_li.pdf` | Beidseitig, gespiegelt auf Rückseite |
| **Hissflagge Wunschformat** | ähnlich | Bis 4 m möglich |
| **Bannerfahne** | `bannerfahne_*.pdf` | Mit Hohlsaum oben, Sturmsicherung unten |
| **Plane Rechteck** | `planen_{w}x{h}.pdf` | PVC oder Mesh-Gewebe, mit Ösen |
| **Plane Wunschformat** | ähnlich | Bis 4 m × variable Breite |
| **Roll-Up / Banner** | `rollup_*.pdf` | Steckt im Display, 85×200 cm Standard |
| **Beachflag / Tropfenfahne** | `beachflag_*.pdf` | Tropfen-, Rechteck-, Halbmond-Form |
| **Faltwand / Messewand** | `faltwand_*.pdf` | Modular, oft mehrere Bahnen |
| **Gerüstbanner** | `geruestbanner_*.pdf` | Für Baugerüste |
| **Wechselbanner** | für Displays | Austauschbar |

### Werbeartikel (`/de/c/werbeartikel/`) — eigener Workflow

Werbeartikel werden oft im 4-Farb-Siebdruck oder Tampondruck veredelt. Andere Workflows (Vektor-Konvertierung, Sonderfarben-Anlage). **Out of scope für Phase 1 des Skills** — nur Druckprodukte + Werbetechnik.

### Kleidung & Textilien (`/de/c/kleidung-textilien/`) — eigener Workflow

Textildruck ist ein eigener Bereich (DTG, Stick, Siebdruck, Sublimation). Andere Workflows (meist PNG mit transparentem Hintergrund). **Out of scope für Phase 1 des Skills**.

---

## URL-Pattern-Lookup (Datenblätter)

Systematisch versuchen, dann Fallback auf User-Eingabe:

```bash
# Beispiele der bestätigten Pattern
https://www.flyeralarm.com/sheets/de/hissfl_q_250x150.pdf       # ✓ bestätigt (Anne Bonny Job)
https://www.flyeralarm.com/sheets/de/hissfl_bs_2ausl_120x300_li.pdf  # ✓ bestätigt
https://www.flyeralarm.com/sheets/de/flyer_a5lang_mass.pdf      # ✓ bestätigt
```

Wenn 200: herunterladen und parsen.
Wenn 403/404: alternatives Format probieren oder User nach Datenblatt fragen.
Wenn keiner passt: User nach Produkt-Konfiguration auf der FLYERALARM-Seite fragen, oder PDF vom User annehmen.

---

## Workflow

### Phase 1 — Pre-Flight (idempotent)

Prüfe und installiere nur was fehlt:

1. **Python-Pakete:** `pip install --quiet Pillow reportlab realesrgan basicsr`
2. **basicsr-Patch** (workaround für neue torchvision-Versionen):
   ```bash
   sed -i 's|from torchvision.transforms.functional_tensor import rgb_to_grayscale|from torchvision.transforms.functional import rgb_to_grayscale|' \
     /usr/local/lib/python3.10/dist-packages/basicsr/data/degradations.py
   ```
3. **System:** `apt-get install -y argyll` (für `colprof` ICC-Builder)
4. **KI-Modell:** Download `https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth` nach `~/.openclaw/print-tools/weights/`
5. **ICC-Profile:** Aus FOGRA-Charakterisierungsdaten bauen (`/usr/share/color/icc/FOGRA39L.ti3`, `FOGRA40L.ti3`, `FOGRA47L.ti3`):
   ```bash
   colprof -v FOGRA39L ISOcoated_v2_300_eci  # in ~/.openclaw/print-tools/profiles/
   ```

### Phase 2 — Input vom User einsammeln

Fehlende Angaben explizit nachfragen:
- Bildpfad oder Bild im Anhang
- FLYERALARM-Produkt-URL **oder** Format + Größe + Konfektionierungs-Optionen
- Bei Hissflaggen: Befestigung links/rechts (bestimmt Datei-Ausrichtung)
- Bei Bannern/Planen: gewünschtes Material (PVC vs. Mesh), Konfektionierung (Ösen, Saum, Keder)

### Phase 3 — FLYERALARM-Datenblatt holen

**Versuche URL-Pattern-Lookup** (siehe Tabelle oben). Falls nichts passt:
- User nach Produkt-URL oder Datenblatt-PDF fragen
- oder Produkt auf FLYERALARM konfigurieren lassen (User schickt Screenshot)

**Aus PDF extrahieren** (mit `pdftotext`):
- **Datenformat** (Breite × Höhe in mm, inkl. Beschnittzugabe)
- **Endformat** (finale Größe)
- **Sichtmaß** (sicherer Bereich minus Einfassband)
- **Beschnittzugabe** (mm oben/unten/links/rechts)
- **Sicherheitsabstand** (mm)
- **Konfektionierungs-Hinweise** (Hohlsaum, Einfassband, Ausleger)

**Wichtige Regeln aus den Datenblättern:**
- „Druckdaten ausschließlich im [Hoch/Quer]format anliefern"
- „Ausrichtung des Formats wie dargestellt anliefern"
- „Keine Drehungen der Seiten im Druck-PDF anwenden"
- „Einfassband: Hier nur Hintergrund anlegen"
- „Vor dem Speichern Ihrer Druckdatei die Druckvorlage löschen"

### Phase 4 — Pipeline (format-adaptiv)

**Format-DPI-Auswahl** (per Heuristik):
- Kleinformat (Visitenkarte, Etikett, Postkarte, Flyer): **300 dpi** (Offset)
- Mittelformat (Broschüre, Magazin, A3+): **300 dpi**
- Großformat (Plakat A2+): **150 dpi**
- Riesenformat (Plane, Hissflagge, Banner): **150 dpi** (bzw. 100 dpi bei >5 m)
- Werbetechnik Outdoor (Mesh, Plane): **100 dpi** (Betrachtung aus Distanz)

1. **Bild laden** (`PIL.Image.open`)
2. **Format konvertieren wenn nötig:**
   - HEIC → JPG (`pip install pillow-heif`)
   - Andere Modi → RGB
3. **Mindestauflösung prüfen:**
   - Ziel: `Datenformat_mm × dpi / 25.4`
   - Wenn zu klein: KI-Upscaling (Real-ESRGAN x4, ggf. mehrstufig)
4. **KI-Upscaling wenn nötig** (CPU-tauglich):
   ```python
   from realesrgan import RealESRGANer
   from basicsr.archs.rrdbnet_arch import RRDBNet
   model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
   upsampler = RealESRGANer(scale=4, model_path='~/.openclaw/print-tools/weights/RealESRGAN_x4plus.pth',
                            model=model, tile=512, tile_pad=10, half=False, device='cpu')
   output, _ = upsampler.enhance(np.array(img), outscale=4)
   ```
   - Bei Bedarf mehrstufig (4x dann nochmal 4x)
   - Logo-Bilder mit flachen Farben: Lanczos ist oft ausreichend, schneller
5. **Logo in Sichtmaß einpassen** (oder bei kleinformatigen Druckprodukten: Seite füllend mit Beschnitt):
   - Für Werbetechnik: Skalieren sodass Logo (mit Sicherheitsabstand) in Sichtmaß passt, zentriert
   - Für Flyer/Postkarte/Visitenkarte: volle Seite füllen bis zur Beschnittkante, KEIN separates Sichtmaß
   - Weißer Hintergrund (oder aus Quelle übernommen wenn er füllt)
6. **RGB → CMYK:**
   ```python
   from PIL import ImageCms
   src = ImageCms.createProfile("sRGB")
   dst = ImageCms.getOpenProfile("~/.openclaw/print-tools/profiles/ISOcoated_v2_300_eci.icc")
   cmyk = ImageCms.profileToProfile(rgb_img, src, dst, outputMode="CMYK")
   ```
7. **PDF/X-3 bauen:**
   ```python
   from reportlab.pdfgen import canvas
   from reportlab.lib.units import mm
   c = canvas.Canvas(out_path, pagesize=(data_w_mm*mm, data_h_mm*mm))
   c.drawImage(cmyk_jpg_path, 0, 0, width=data_w_mm*mm, height=data_h_mm*mm)
   c.save()
   ```
   - PDF-Version 1.3 (von reportlab default)
   - JPEG-Qualität 95% für volle PDF

### Phase 5 — Output

Im Projektordner (z.B. `~/.openclaw/workspace/projects/<projekt>/`):
- `<motiv>-print.pdf` — Volle Qualität
- `<motiv>-print-compressed.pdf` — Telegram-tauglich (<20 MB, JPEG-Qualität 70%)
- `<motiv>-preview.jpg` — RGB-Vorschau für schnellen Check

Upload-Anleitung an User:
1. FLYERALARM-Produkt konfigurieren
2. „Daten-Upload" → PDF hochladen
3. Datencheck sollte grün werden (PDF v1.3, CMYK, korrektes Format)
4. Bei „niedrige Auflösung"-Warnung: bei Großformat oft false positive, einfach bestätigen
5. Bei „CMYK-Farbprofil nicht Standard": die selbstgebauten Profile sind technisch korrekt, FLYERALARM konvertiert intern ggf. nochmal

### Phase 6 — Telegram-Versand

- Volle PDF (>20 MB) → **geht nicht** per Telegram Bot API (20 MB Limit)
- Komprimierte PDF (≤20 MB) per `message` tool mit `asDocument: true` senden
- Volle PDF: User per SFTP/SCP oder Dateipfad-Nennung darauf hinweisen

---

## Bekannte Stolpersteine

| Problem | Lösung |
|---------|--------|
| `from torchvision.transforms.functional_tensor import rgb_to_grayscale` fails | Patch wie in Phase 1.2 |
| `ImageCmsProfile.convert()` AttributeError | `ImageCms.profileToProfile()` stattdessen |
| ICC-Download von ECI.org scheitert (Login, tot) | Lokal aus FOGRA `.ti3` bauen (siehe Phase 1.5) |
| `apt-get install` ohne Root | `sudo` prefix oder User-venv |
| `python3 -u` output gebuffert | `-u` Flag bei Real-ESRGAN-Aufruf |
| Real-ESRGAN hängt auf CPU | tile=512 als Memory-Schutz, ~6-10 Min für 1280×769 |
| HEIC von iPhone | `pillow-heif` installieren |
| FLYERALARM Datenblatt-URL 403/404 | Alternative Pattern probieren oder User fragen |
| FLYERALARM Datencheck „CMYK-Profil unbekannt" | Selbstgebautes ISO Coated v2 ist OK, FLYERALARM konvertiert intern |

---

## Beispiel-Aufrufe

```
User: „Wir brauchen Visitenkarten 85×55 mm, 250 Stück, einseitig bedruckt mit unserem Vereinslogo. Hier ist das Logo [attachment]."

Skill:
1. Pre-Flight prüfen (Tools installieren falls fehlend)
2. Datenblatt suchen via Pattern: vis_a5lang_mass.pdf o.ä. → bei 404 User nach Datenblatt fragen
3. Specs extrahieren: Daten 91×61 mm (85+3+3 × 55+3+3), 300 dpi, 3 mm Beschnitt ringsum
4. Logo in 91×61 mm einpassen (vollflächig, mit Beschnitt)
5. RGB → CMYK (ISO Coated v2)
6. PDF bauen (91×61 mm, 300 dpi, Logo füllt)
7. User schicken + Upload-Anleitung: 250 Stück → „Standard-Datenprüfung" reicht
```

```
User: „Flyer A5 beidseitig für unseren St. Pauli-Fan-Artikel-Store."

Skill:
1. Datenblatt: https://www.flyeralarm.com/sheets/de/flyer_a5lang_mass.pdf (oder vergleichbar)
2. Specs: A5 (148×210 mm), 3 mm Beschnitt, 300 dpi, 4/4-farbig
3. Vorderseite + Rückseite als 2 separate Bilder (oder 2-seitiges PDF)
4. CMYK + 300 dpi
5. PDF bauen
```

---

## Out of Scope (Phase 1)

- **Werbeartikel** (Becher, Kugelschreiber, Tassen): Eigener Workflow mit Sonderfarben und Tampondruck-Logiken
- **Textilien** (T-Shirts, Taschen): DTG/Sublimation/Stick — anderes Dateiformat (meist PNG mit Alpha), andere ICC-Profile
- **Verpackungen** (Faltschachteln): Stanzkonturen, komplexere Workflows
- **Bücher** mit Cover und Inhalt: Mehrseitige PDFs, Bundzugabe
- **Sonderfarben / Veredelungen** (Goldfolie, UV-Lack): Eigener Workflow mit 5. Farbkanal
- **Personalisierung** (Adressen, Namen): Datenbank-Anbindung, Serienbrief-Funktion
- **Interaktive PDF-Formulare**: Out of scope

Diese können als zukünftige Skill-Varianten oder Erweiterungen kommen.

---

## Cleanup-Hinweis für User

Nach Job-Ende kann alles unter `~/.openclaw/print-tools/` gelöscht werden wenn keine weiteren Print-Jobs anstehen. Spart ~64 MB.
