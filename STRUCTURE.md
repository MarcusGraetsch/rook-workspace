# Rook Workspace Structure

Dieses Repository enthält die gesamte Arbeitsumgebung für Rook (Marcus' persönlicher Assistent) und zugehörige Projekte.

## 📁 Verzeichnisstruktur

```
workspace/
│
├── rook/                          # ROOK-SYSTEM: Meine Identität, Konfiguration, Betrieb
│   ├── core/                      # Essenzielle Systemdateien
│   │   ├── AGENTS.md              # Agenten-Konfiguration und -Definitionen
│   │   ├── SOUL.md                # Meine Persönlichkeit, mein "Wesen"
│   │   ├── USER.md                # Informationen über Marcus
│   │   ├── IDENTITY.md            # Meine Identität (Name, Emoji, etc.)
│   │   ├── TOOLS.md               # Tool-Konfiguration und Notizen
│   │   ├── HEARTBEAT.md           # Periodische Tasks und Checks
│   │   ├── SECRETS.md             # Geheime Konfiguration (nicht im Git)
│   │   └── CLADE-MEM.md           # Clade-Memory (falls verwendet)
│   │
│   ├── ops/                       # Betrieb und Operation
│   │   ├── backups/               # Automatische Backups
│   │   └── memory/                # Memory-Dateien (Tägliche Logs)
│   │
│   ├── skills/                    # OpenClaw Skills
│   │   ├── installed/             # Von ClawHub installierte Skills
│   │   └── custom/                # Selbstgebaute Skills
│   │
│   └── dev/                       # Entwicklungsumgebung
│       └── openclaw/              # OpenClaw Fork (git submodule oder benachbarter Clone)
│           # → Siehe: https://github.com/MarcusGraetsch/openclaw
│
├── coaching/                      # COACHING: Therapeutische/beratende Rolle
│   ├── sessions/                  # Gesprächsnotizen (keine Roh-Transkripte)
│   ├── goals/                     # Ziele, Tracking, Fortschritt
│   ├── reflections/               # Reflexionen, Journaling
│   ├── exercises/                 # Techniken, Übungen, Frameworks
│   └── insights/                  # Erkannte Muster über Zeit
│
├── assistant/                     # ALLTAGS-ASSISTENZ: Inbox-Zero Prinzip
│   ├── inbox/                     # Eingehendes – unverarbeitet
│   ├── active/                    # Aktuell in Arbeit
│   ├── waiting/                   # Warte auf Marcus/Dritte
│   ├── done/                      # Erledigt (aktuelles Quartal)
│   └── quick-capture/             # Sprachnotizen, Schnellideen
│
├── engineering/                   # ENGINEERING: Developer/Engineer Rolle
│   ├── prototypes/                # Schnelle Experimente, Spike-Lösungen
│   ├── tools/                     # Selbstgebaute Tools/Skripte
│   ├── snippets/                  # Code-Snippets, Templates
│   └── docs/                      # Technische Dokumentation
│
├── projects/                      # GROSSE PROJEKTE
│   ├── digital-research/          # Digital Capitalism Research
│   │   ├── src/                   # AutoResearchClaw Code
│   │   ├── data/                  # Forschungsdaten (research/, literature/, etc.)
│   │   └── output/                # Briefings, Discovery-Reports
│   │
│   ├── working-notes/             # working-notes.org Webseite
│   │   # → Eigenes Git-Repo: github.com/MarcusGraetsch/working-notes
│   │   # (war vorher: marcus-cyborg)
│   │
│   └── book-project1/             # Buch-Projekt (neutraler Name)
│       # → Kapitel, Manuskripte, Recherche
│
├── tasks/                         # KLEINE PROJEKTE/TASKS (< 2 Wochen)
│   ├── noctiluca-contact/         # Aaron/Noctiluca Networking
│   ├── template/                  # Vorlage für neue Tasks
│   └── _archive/                  # Abgeschlossene Kleinprojekte
│
└── archive/                       # LANGFRISTIGES ARCHIV
    ├── email-archive/             # Archivierte E-Mails
    ├── news/                      # News-Archiv
    └── old-projects/              # Eingestellte Projekte

```

## 🔗 GitHub Repositories

| Lokaler Pfad | GitHub Repo | Zweck |
|--------------|-------------|-------|
| `rook/` | `MarcusGraetsch/rook-agent` | Mein System, meine Config |
| `projects/digital-research/` | `MarcusGraetsch/digital-capitalism-research` | Research-Projekt |
| `projects/working-notes/` | `MarcusGraetsch/working-notes` | Webseite (eigenes Repo) |
| `rook/dev/openclaw/` | `MarcusGraetsch/openclaw` | OpenClaw Fork |

## 🔄 Workflow

1. **Alles unter `rook/`** ist MEIN System. Hier dokumentiere ich, wer ich bin und wie ich funktioniere.
2. **Coaching/Assistant/Engineering** sind meine Rollen – Dateien hier werden regelmäßig geprüft und archiviert.
3. **Projects** sind Marcus' große Projekte – mit eigener Roadmap und Zielen.
4. **Tasks** sind kurzfristige Dinge – nach Abschluss ins `_archive/` verschieben.
5. **Archive** ist langfristige Aufbewahrung – wird selten angefasst.

## ⚠️ Wichtige Regeln

- **Niemals SECRETS.md commiten** (ist in .gitignore)
- **Memory-Dateien täglich commiten** (automatisch oder manuell)
- **Große Binärdateien** nicht ins Git (Podcasts, Videos, große Embeddings)
- **Projekt-Ordner** haben ihre eigenen READMEs mit spezifischen Anweisungen

## 🆘 Notfall-Wiederherstellung

Falls etwas schiefgeht:
1. `git log` – finde den letzten guten Commit
2. `git checkout <commit-hash>` – zurücksetzen
3. Oder: Backup aus `rook/ops/backups/` verwenden

---

*Struktur erstellt: 2026-03-26*
*Letzte Aktualisierung: siehe Git-History*
