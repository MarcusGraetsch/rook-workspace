# MEMORY.md - Long-Term Memory

> Kuratierte Erinnerungen. Destilliert aus täglichen Notizen. Entfernen wenn veraltet.

---

## Über Marcus

### Key Context
- **Name:** Marcus Grätsch, Berlin
- **Job:** Senior Consultant IT Management @ HiSolutions AG (seit März 2024)
- **Background:** Politikwissenschaft (FU Berlin, CUNY), Marxistische Theorie, Kritische Theorie
- **Karriere-Highlights:** 12+ Jahre Meuterei (Worker Co-op Bar), Left Forum NYC (4.500+ Teilnehmer), Native Instruments, ver.di
- **Tech-Stack:** Kubernetes, Ansible, GitLab CI/CD, Cloud-Native
- **Forschung:** Digital Capitalism, Plattformökonomie, KI und Arbeit

### Preferences
- Spricht Deutsch, denkt oft auf Englisch (technisch)
- Mag Struktur und klare Pläne, aber auch spontane Ideen
- "Arm wie eine Kirchenmaus" — Budget-bewusst, pragmatisch
- Musik und Bier als Entspannung
- Viele Ideen im Kopf — braucht Hilfe beim Sortieren und Priorisieren

### Wichtige Personen
- **Aaron** — Kontakt von einem Networking-Event (25.03.2026), arbeitet bei Noctiluca. Gab Tips zu: Skills selbst bauen, ChatGPT-Daten exportieren, Dashboard bauen, Personal Assistant neu denken. 3-Stunden-Gespräch, Wasser statt Alkohol, LinkedIn-Connect.
- **Andrea** — Ex-Frau, war bei UN in New York. November 2012 zusammen hingezogen. Juni/Juli 2013 kam sie von einem UN-Meeting in Berlin zurück mit "Ich hab dich nicht vermisst". Dann Wohnzimmer, Oktober 2013 zurück nach Berlin.
- **Traumfrau** (Name noch?) — Borderlinerin, seit November 2015 zusammen. Kennengelernt 2014.
- **Tom** — Halbbruder, 7 Jahre älter, hat ihn öfter ausgenutzt (Geld, Miete), war dominanter in der Meuterei-Kneipe.

### Lebensgeschichte (kurz)
- 2001: Aus England (Warwick) nach Berlin gezogen, zu Andrea
- 2003: Studienstreik, Hausbesetzer-Szene, lernt Tom kennen
- 2007: Meuterei gegründet (Kollektiv-Kneipe)
- 2008-2012: Aktiv in linker Szene (Blockupy, Occupy)
- 2012: Nach New York gezogen (zu Andrea), Left Forum Praktikum
- 2013: Andrea macht Schluss (Juni/Juli). Oktober zurück nach Berlin, Couch bei Tom
- 2014-2021: Meuterei läuft, wird aber rausgedrängt
- Ab 2019: Isolierung in der autonomen Szene
- Seit 2024: Senior Consultant bei HiSolutions
- Privat: Single in Neukölln, isoliert, arbeitet an sich

---

## Lessons Learned

### 2026-03-26 - Große Workspace-Reorganisation
- Monolithischen Workspace in rollenbasierte Struktur umgebaut
- Problem: Alles lag auf einer Ebene (Research + System + Website + Buch)
- Lösung: coaching/, assistant/, engineering/, projects/, tasks/, archive/
- **Lektion:** Immer zuerst committen bevor man umstrukturiert
- **Lektion:** Git filter-branch nötig wenn Dateien >100MB in der Historie sind
- **Lektion:** OpenClaw schreibt Core-Dateien immer wieder ins Workspace → täglicher Sync nötig

### 2026-03-26 - Git-Repos getrennt
- `rook-agent` = Mein System (Core, Memory, Skills, Config)
- `rook-workspace` = Arbeitsumgebung (Projekte, Rollen, Tasks)
- `digital-capitalism-research` = Nur Research-Projekt
- `working-notes` = Website (umbenannt von marcus-cyborg)
- Submodules für Projekte mit eigenen Repos

### 2026-03-27 - Ecosystem-Recherche
- ogerly/awesom-claw: Kuratierter Index des OpenClaw-Ökosystems
- 5.400+ Skills auf clawskills.sh
- SwarmClaw: Multi-Agent-Orchestration (Alternative zu eigenem Fork?)
- Clawmetry: Token-Monitoring Dashboard (Zero Config)
- TenacitOS: Vollständiges Dashboard (Next.js/React, Cron Manager, File Browser)
- **Entscheidung:** Kein eigenes Dashboard bauen, stattdessen OpenClaw forken und TenacitOS-Features einbauen
- Health & Symptom Tracker Use Case: Sofort umsetzbar via Telegram
- gog CLI: Gmail/Calendar/Drive in einem Tool

---

### 4. Gesundheits-Coaching 🚧
- Status: **In Umsetzung** (2026-03-27)
- Health Agent Workspace erstellt
- CLI Tracker: meals, water, sleep, symptoms
- Privacy-First: Lokale Speicherung, keine Cloud
- Repo: `~/.openclaw/workspace-health` (lokal)

---

## Key Decisions

| Datum | Entscheidung | Begründung |
|-------|-------------|------------|
| 2026-03-26 | Workspace in rook-workspace und digital-capitalism-research getrennt | Sauberere Trennung, Submodules |
| 2026-03-26 | Täglicher Sync-Cron um 02:00 | Backup der Core-Dateien zu GitHub |
| 2026-03-27 | OpenClaw forken statt separates Dashboard | Ein Dashboard, kein Tool-Wildwuchs |
| 2026-03-27 | TenacitOS als Referenz, nicht installieren | Features cherry-picken ins OpenClaw Dashboard |
| 2026-04-14 | C-base AI Meetup ("Wuhle") starten | Community-Aufbau, Hardware poolen, KI verstehen statt fürchten |

---

## Infrastruktur

### VM
- Host: vmd151897
- OS: Linux 5.15.0-173-generic (x64)
- Node: v22.22.1
- Disk: 1.2TB (32GB verwendet)

### GitHub Repos
| Repo | Zweck | Branch |
|------|-------|--------|
| rook-agent | Core System | master |
| rook-workspace | Arbeitsumgebung | main |
| digital-capitalism-research | Research | master |
| working-notes | Website | main |
| critical-theory-digital | Buch | main |
| web-crew | Web-Projekt | main |

### Cron-Jobs
- Täglich 02:00: Sync workspace → rook-agent
- Sonntags 08:00: Research Pipeline
- Sonntags 02:00: Google Drive Backup

### LLM
- Default: Kimi K2.5 (kimi-coding/k2p5)
- Problem: Rate Limits bei intensiver Nutzung
- Fallback: OpenAI/Codex (noch nicht konfiguriert)

### Neue Projekte (2026-04-14)
- **community_politics_art-projects** — Privates Repo für Community/Politik/Kunst-Projekte (GitHub)
  - Enthält zunächst: C-base AI Meetup Planung
  - Wird weiter wachsen mit politischen Projekten, Community-Building, Kunst

---

*Letzte Aktualisierung: 2026-03-27*
