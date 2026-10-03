# Schritt-für-Schritt Anleitung: AI-Kurzfilm „Das Recht des Überwältigers"
> **Zielgruppe:** Anfänger (keine Vorkenntnisse nötig)
> **Budget:** ~€0
> **Zeit:** ca. 20–40 Stunden Gesamtarbeit
> **basemap:** Beginner

---

## Überblick

**Das Projekt:**
- 10–12 Min. AI-generierter Kurzfilm
- Schiller's *Die Räuber* trifft Berliner Enteignungsdebatte
- 6 Szenen + Epilog (Drehbuch liegt in `01-script/DREHBUCH.md`)

**Was du brauchst:**
- Computer oder Laptop
- Internetverbindung
- Einen kostenlosen Account bei Leonardo.ai oder Ideogram.ai
- Einen kostenlosen Account bei Runway oder Pika Labs
- Einen kostenlosen Account bei ElevenLabs

---

## Phase 0: Vorbereitung (Woche 1)

### Schritt 0.1 — Ordner anlegen

Erstelle auf deinem Computer:
```
raeuber-film/
├── 01-script/          # Drehbuch (bereits fertig!)
├── 02-storyboard/      # Visuelle Skizzen
├── 03-assets/          # KI-generierte Bilder
├── 04-video/           # Videoclips
├── 05-audio/           # Musik & Stimmen
└── 06-export/          # Finale Version
```

### Schritt 0.2 — Recherche (2–3 Stunden)

Lies die Szenen im Drehbuch (`01-script/DREHBUCH.md`) durch.
Verstehe die drei Konfliktlinien:
- Franz Moor = Immobilienkapital (kalt)
- Karl Moor = Verfassungsweg (langsam aber demokratisch)
- Spiegelberg = Direkte Aktion (radikal)

---

## Phase 1: Bilder generieren (Woche 1–2)

### Schritt 1.1 — KI-Bilder erstellen

**Tool:** Leonardo.ai (kostenlos, 150 Token/Tag)

**Workflow:**
1. Öffne [leonardo.ai](https://leonardo.ai)
2. Klicke „Create" → „Image Generation"
3. Gib einen AI-Prompt aus dem Drehbuch ein
4. Wähle „PhotoReal" Stil
5. Klicke „Generate"
6. Speichere das beste Ergebnis als PNG

**Für jede Szene brauchst du 4–6 Bilder:**

| Szene | Was |
|-------|-----|
| 1 — Gläserne Zentrale | Franz im Turm, Berlin bei Nacht, Börsenkurse |
| 2 — 59,1 % | Roter Rathaus, leuchtende Zahlen, Nebel |
| 3 — Kiez-Räuber | Kellerraum, Aktivisten, Stadtpläne |
| 4 — Digital-Intervention | Gehackte Bildschirme, Aktiensturz |
| 5 — Jüngstes Gericht | Franz zusammenbruch, Art. 15 leuchtet |
| 6 — Epilog | Menschenmenge, Sonnenaufgang |

**Beispielprompt für Leonardo.ai:**
```
A cold corporate CEO in a sharp tailored suit standing in a glass skyscraper 
overlooking rainy Berlin at night, stock charts floating on holographic 
displays, red and orange neon reflections, dark moody lighting, 
hyper-realistic, cinematic, 8k --ar 16:9 --style photoReal
```

### Schritt 1.2 — Konsistente Figuren

**Problem:** Franz soll in jeder Szene gleich aussehen.

**Lösung für Anfänger:**
- Beschreibe Franz in JEDEM Prompt immer gleich:
  ```
  A 45-year-old German CEO with short grey hair, sharp navy suit, 
  cold blue eyes
  ```
- Generiere zuerst ein sehr gutes Bild von Franz
- Lade es bei Leonardo als „Reference Image" hoch
- Nutze es als Basis für alle weiteren Franz-Bilder

---

## Phase 2: Videos generieren (Woche 2–3)

### Schritt 2.1 — Bilder zu Videos machen

**Tool:** Runway Gen-3 (kostenlos, 125 Credits)

**Workflow:**
1. Öffne [runwayml.com](https://runwayml.com)
2. Klicke „Gen-3 Alpha"
3. Lade dein KI-Bild hoch
4. Schreibe ein Motion-Prompt (z.B. „slow camera pan left")
5. Wähle 3–5 Sekunden
6. Klicke „Generate"
7. Exportiere als MP4

**Motion-Tipps:**
- Bewege die Kamera LANGSAM (0.5–1°/Sekunde)
- Nicht zu viel Bewegung — weniger ist mehr
- Nutze: `slow zoom in`, `slow pan left`, `camera push forward`

### Schritt 2.2 — Typische Fehler vermeiden

| Fehler | Lösung |
|--------|--------|
| Figuren ändern sich | Consistent Character Reference nutzen |
| Ruckelige Bewegung | Kürzere Clips (3–5 Sek) |
| Zu viel Action | Weniger Motion, einfach halten |
| Unnatürliche Gesichter | `--style raw` nutzen |

---

## Phase 3: Audio aufnehmen (Woche 3)

### Schritt 3.1 — KI-Stimmen generieren

**Tool:** ElevenLabs (kostenlos, 10.000 Zeichen/Monat)

**Workflow:**
1. Öffne [elevenlabs.io](https://elevenlabs.io)
2. Klicke „Voice Library" → Suche nach „German"
3. Wähle eine Stimme:
   - Franz: Tief, kalt, männlich
   - Karl: Warm, engagiert, männlich
   - Spiegelberg: Rau, aggressiv, männlich
   - Chor: Viele Stimmen gemischt
4. Kopiere den Text aus dem Drehbuch
5. Klicke „Generate Audio"
6. Lade als MP3 herunter

**Stimmen-Empfehlungen (in Voice Library suchen):**
| Figur | Stichwort |
|-------|-----------|
| Franz Moor | „cold", „corporate", „male" |
| Karl Moor | „warm", „passionate", „male" |
| Spiegelberg | „rough", „aggressive", „male" |
| Chor | „ensemble", „dramatic" |

### Schritt 3.2 — Musik generieren

**Tool:** Suno (kostenlos, 250 Credits/Tag)

**Workflow:**
1. Öffne [suno.ai](https://suno.ai)
2. Klicke „Create"
3. Schreibe einen Musik-Prompt:
   ```
   dark industrial beat, cello melody, German expressionist drama,
   tension and urgency, Sturm und Drang, 120 bpm, cinematic
   ```
4. Wähle „Instrumental"
5. Klicke „Create"
6. Lade das beste Ergebnis als MP3 herunter

**Musik-Prompts für jede Szene:**
| Szene | Prompt |
|-------|--------|
| 1 (Franz) | `dark cello, cold industrial ambient, suspense, minimal` |
| 2 (59,1%) | `church organ, dramatic, slow build, German baroque` |
| 3 (Keller) | `acoustic guitar, folk, intimate, quiet tension` |
| 4 (Hack) | `industrial beat, bass heavy, fast, cyberpunk, glitch` |
| 5 (Gericht) | `deep organ, horror, slow crescendo, strings` |
| 6 (Epilog) | `hopeful cello, strings orchestra, dawn, cinematic` |

---

## Phase 4: Schneiden (Woche 4–5)

### Schritt 4.1 — Software installieren

**Empfehlung:** CapCut Desktop (kostenlos, sehr einfach)
- Lade herunter von [capcut.com](https://capcut.com)
- Alternativ: DaVinci Resolve (kostenlos, aber komplexer)

### Schritt 4.2 — Timeline aufbauen

1. Öffne CapCut → „New Project"
2. Klicke „Import" → Lade alle MP4-Videoclips
3. Ziehe die Clips auf die Timeline (Spur 1)
4. Ziehe die Musik darunter (Spur 2, leiser!)
5. Ziehe die Voiceover-Stimmen darüber (Spur 3)
6. Schneide die Clips passend zur Stimme

**Grundregeln:**
- Voiceover bestimmt das Tempo
- Musik NIE lauter als Sprache
- Schnitte auf Beat-Wechsel der Musik
- B-Roll (Bilder) über Voiceover legen

### Schritt 4.3 — Farbe korrigieren

In CapCut:
1. Klicke auf einen Clip
2. Wähle „Filter" → „Cinematic Teal & Orange"
3. Oder: „Basic Correction" → Ziehe Kontrast hoch, Sättigung leicht runter

**Cyberpunk-Berlin-Look:**
- Schatten: kalt blau
- Lichter: warm orange
- Kontrast: hoch
- Keine zu hohe Sättigung

### Schritt 4.4 — Untertitel erstellen

1. Klicke auf die Timeline
2. Wähle „Auto Captions" (oder „Untertitel")
3. Wähle „Deutsch"
4. Klicke „Generate"
5. Prüfe die Untertitel — korrigiere Fehler

---

## Phase 5: Exportieren & Veröffentlichen (Woche 5–6)

### Schritt 5.1 — Export-Einstellungen

In CapCut:
1. Klicke „Export"
2. Wähle:
   - Format: MP4
   - Auflösung: 1080p (1920×1080)
   - Quality: Hoch
   - FPS: 30

### Schritt 5.2 — YouTube optimieren

**Dateiname zum Hochladen:**
`Das Recht des Überwältigers — Schiller trifft Berlin.mp4`

**Titel:**
`Das Recht des Überwältigers — Schiller trifft Berlin | AI-Kurzfilm`

**Beschreibung:**
```
Was passiert, wenn Schillers „Die Räuber" auf die Berliner 
Enteignungsdebatte treffen? Ein AI-generierter Kurzfilm über 
den Volksentscheid 2021 und den Kampf um bezahlbares Wohnen.

59,1 % haben gestimmt. Der Senat schweigt. Die Konzerne kassieren.
Aber die Verfassung steht. Art. 15 wartet.

#Schiller #DieRäuber #Berlin #Enteignung #KI #Kunst
```

**Tags:**
`Schiller, Die Räuber, Berlin, Enteignung, KI-Film, Volksentscheid, Kurzfilm, Art. 15 GG`

### Schritt 5.3 — Checkliste vor dem Upload

- [ ] Film komplett durchgesehen (keine Schnitte-Fehler)
- [ ] Untertitel geprüft (keine Tippfehler)
- [ ] Musik-Rechte geklärt (eigene Musik oder CC0)
- [ ] Ton geprüft (kein Clippen, kein Rauschen)
- [ ] Thumbnail erstellt (Canva.com — kostenlos)

---

## Kosten-Übersicht

| Posten | Kosten | Tool |
|--------|--------|------|
| Bilder | €0 | Leonardo.ai |
| Video | €0 | Runway Gen-3 |
| Stimmen | €0 | ElevenLabs |
| Musik | €0 | Suno |
| Schnitt | €0 | CapCut Desktop |
| **Gesamt** | **€0** | |

---

## Nächste Schritte (was zuerst tun?)

1. **Heute:** Ordner-Struktur anlegen
2. **Diese Woche:** Leonardo.ai Account erstellen, erste Bilder generieren
3. **Nächste Woche:** Runway-Account, erste Videos testen
4. **Woche 3:** ElevenLabs, Stimmen aufnehmen
5. **Woche 4:** Suno, Musik generieren
6. **Woche 5:** Schnitt in CapCut
7. **Woche 6:** Export & YouTube-Upload

---

## AI-Prompts für alle Szenen (Copy-Paste)

**Szene 1 — Franz im Turm:**
```
Cinematic shot, hyper-realistic, a cold corporate CEO in a sharp tailored 
suit standing in a glass skyscraper overlooking rainy Berlin at night, 
stock charts and real estate data floating on holographic displays, 
red and orange neon reflections on wet glass, dark moody blue lighting, 
8k resolution, cyberpunk realism, film grain --ar 16:9
```

**Szene 2 — 59,1 % über dem Roten Rathaus:**
```
A giant glowing holographic text "59.1%" floating over the Berlin Red 
City Hall at dusk, slowly getting covered by bureaucratic paper walls 
and grey fog, realistic news footage style, dramatic lighting, 
crowds celebrating in the background, cinematic atmosphere --ar 16:9
```

**Szene 3 — Kellerraum in Neukölln:**
```
Cinematic shot, hyper-realistic, a dimly lit basement room in a Berlin 
Altbau building, a group of activists and lawyers sitting around a wooden 
table with city maps and legal documents on the walls, warm candlelight 
contrasting with cold industrial atmosphere, tense faces, rain visible 
through small basement windows, 8k resolution, neo-realist style --ar 16:9
```

**Szene 4 — Digital-Intervention:**
```
A rapid montage of digital advertisement screens in a Berlin shopping 
street hacked to show legal text and faces of tenants, stock market 
terminals showing crashing real estate stocks, blue and purple neon 
light, cinematic news style, fast cuts, cyberpunk aesthetics, 8k --ar 16:9
```

**Szene 5 — Franz' Zusammenbruch:**
```
Cinematic shot, hyper-realistic, a powerful corporate CEO on his knees 
in a dark empty corporate skyscraper hallway, blue light projecting 
glowing constitutional law text "ARTIKEL 15 GG" on glass walls, 
dramatic chiaroscuro lighting, fog machines, German expressionist 
cinema style, 8k resolution --ar 16:9
```

**Szene 6 — Epilog, Morgengrauen:**
```
A dramatic sunrise over Berlin rooftops, a crowd of hundreds of people 
standing in a street holding copies of law books and signs, a man in 
a worn coat holding up a constitution document to the camera, warm 
golden morning light breaking through dark clouds, cinematic wide shot, 
hope and determination, German new wave cinema aesthetic, 8k --ar 16:9
```
