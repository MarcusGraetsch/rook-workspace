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
→ **Inhalt ausgelagert nach `private/marcus-personal-context.md` (Sektion 1)** — Beziehungen, Privatleben, biographische/politische Details, Misstrauen-Positionen, Tiefenpsychologie-Kontext. Diese Datei ist privat (Marcus + Phoenix); Rook referenziert sie bei Bedarf.

**Kurzform (für operative Zwecke):**
- **Eltern (Bremen)** — wichtigste Vertrauenspersonen, eigenes Haus, **begrenztes Zeitfenster** (alt)
- **Cousin (Bremen-Umland)** — zweite Vertrauensperson, jünger, längerfristig tragfähig
- **Phoenix** — andere Persona/Agent, kennt biographischen Kontext, „Korrektiv"

---

### Memory-Search (behoben)
- **Problem:** 2026-05-27: Memory-Search down wegen OpenAI Quota erschöpft
- **Status:** ✅ Behoben — läuft mit built-in backend (lokale Vektor-Suche)
- **Prüfung:** 2026-06-07: Suchanfragen liefern relevante Treffer aus historischen Sessions
- **Kein OpenAI API Key nötig** für Memory-Search
- **Notiz:** Falls OpenAI Embeddings für bessere Qualität gewünscht → API Key konfigurieren

### Wiki-Lint Cron-Job
- **ID:** `dc1ddcd4-17fd-4e49-b736-a5ff16110e7f`
- **Name:** "Wiki Bi-Monthly Lint"
- **Schedule:** Am 1. jedes ungeraden Monats um 10:00 Berlin (`0 10 1 1,3,5,7,9,11 *`)
- **Was es tut:** Health Check → Report in `wiki/wiki-lint-report.md`
- **Auto-Repair:** Der Cron repariert Orphan Topics und Cross-References automatisch

### Wiki-Lint Script
- **Ort:** `/root/.openclaw/workspace/operations/bin/wiki-lint.js`
- **Prüft:** Orphan Pages (<30 Zeilen), fehlende Cross-Refs, veraltete Info (>90 Tage)
- **Report:** `wiki/wiki-lint-report.md`

### Wiki-Struktur
- 30 Topics in `wiki/topics/`
- Jedes Topic: `wissensbasis.md` (Hauptsynthese)
- Cross-References: `→ [[topic-name]]` Syntax
- Schema: `wiki/WIKI-SCHEMA.md`

---

## Auto-Save Research Skill
- **Neu erstellt:** 2026-06-08
- **Problem:** Research-Dateien (z.B. KI-Chronologie) werden erstellt aber nicht automatisch committed
- **Lösung:** `auto-save-research` Skill + Cron-Job alle 30 Minuten
- **Script:** `.agents/skills/auto-save-research/scripts/check-and-save.js`
- **Watched dirs:** `research/`, `projects/digital-research/`, `wiki/`, `memory/`
- **Erster Test:** ✅ Erfolgreich — 8 Dateien committed und gepusht
- **Nächster Schritt:** Cron-Job einrichten
- **Problem:** Rook hat direkt `npm install -g openclaw@latest` ausgeführt → Session gecrasht
- **Fix:** Phoenix (Hermes Agent) hat Session-Datei gelöscht, Gateway + Node neu gestartet
- **Ursache:** CVE-Skill oder manueller Befehl hat direkt npm install ausgeführt, ohne openclaw-update Skill zu nutzen
- **Lösung:**
  1. `openclaw-update` Skill verfeinert: Pre-Flight Checks, Graceful Shutdown, Retry-Logik
  2. Cron-Jobs zeitlich auseinandergezogen:
     - Daily Research: 7:30 Uhr (vorher 8:30)
     - Community Intelligence: 10:00 Uhr (Di/Fr)
     - Wiki Weekly: 10:00 Uhr (Sonntag)
     - Wiki Bi-Monthly: 10:00 Uhr (1. ungerader Monat)
  3. Failure Alerts für Cron-Jobs konfiguriert (nach 2 Fehlern, 1h Cooldown)
- **Regel:** NIE `npm install -g openclaw` direkt ausführen — immer openclaw-update Skill nutzen
- **Regel:** Mindestens 30 Minuten Abstand zwischen Updates und Cron-Jobs

### Commit Boundaries
- **Auto-commit (cron, `auto-save-research` alle 30min):** `research/`, `projects/digital-research/`, `wiki/`, `memory/`
- **Manual only (curated, brauchen Review + Commit-Message):** `.agents/skills/` — Meta-Config, kein Daten-Churn
- **Privat, niemals commit:** `private/` (Marcus + Phoenix context)
- **Generiert / Tool-State, nicht committen:** `HEARTBEAT.md`, `briefings/`, `operations/docs/reports/`, `.clawhub/lock.json` — OpenClaw-rekonstruierbar
- **Hybrid:** `MEMORY.md` — wird von OpenClaw erweitert, periodisch via daily sync committed
- **Skills Visibility-Hilfe:** erst beim Sonntags-Heartbeat 20.06. testen (YAGNI bis Realität Gegenteil beweist)

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

### 2026-06-05 - Repositories & Themen-Zuordnung
| Repo | Thema | Zweck |
|------|-------|-------|
| **rook-workspace** | Workspace, Memory, Tools, Skills | Mein persönliches System |
| **rook-agent** | Core System, Config, Skills | OpenClaw Agent-System |
| **digital-capitalism-research** | KI-Chronologie, Research, Digital Capitalism | Forschungsprojekte |
| **working-notes** | Website, Blog | Öffentliche Inhalte |
| **rook-k8s-lab** | Kubernetes, IDP | Technische Experimente |
| **idp-customer-onboarding** | Kundenprojekte | HiSolutions Arbeit |

**Regel:** Digital Research → `digital-capitalism-research` (nicht rook-workspace)
- KI-Chronologie, Research, Digital Capitalism → immer in `digital-capitalism-research`
- Workspace, Memory, Tools → `rook-workspace`
- Neue Themen → prüfen, ob neues Repo nötig

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
| 2026-06-12 | **Wuhle eingestellt**, stattdessen **AI Enthusiasts in c-base** beitreten (ab Mo 15.06.2026) | Maintainer: Sasquatch; hat bereits lokalen KI-Server in c-base; gleiche Diskussion wie bei Wuhle geplant |

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

## LLM
- **Primary:** MiniMax-M3 (minimax/MiniMax-M3) — seit 2026-06-06
- **Fallback:** Kimi K2.5 (kimi-coding/k2p5) — API Key Problem (401), fix pending
- **Previous:** Kimi K2.5 war Primary bis 2026-06-06

### Neue Projekte (2026-04-14)
- **community_politics_art-projects** — Privates Repo für Community/Politik/Kunst-Projekte (GitHub)
  - Enthält zunächst: C-base AI Meetup Planung
  - Wird weiter wachsen mit politischen Projekten, Community-Building, Kunst

---

### Resilience-Setup (laufendes Projekt)
- **Erstellt:** 2026-06-12
- **Dokument:** `private/marcus-resilience-todo.md` (Konsolidiert: Architektur + ToDos + Phoenix-Kontext, eine Datei im private/-Ordner)
- **Treiber:** Geopolitische Sorge (Europa-Russland), **Datensouveränität als politische Hygiene** (Misstrauen gegen US-Cloud, CLOUD Act/FISA 702), Wohnmobil-Mobilität
- **Hardware-Empfehlung:** Minisforum AI X1 Pro (Ryzen AI 9 HX 370, 890M, 64GB) als Primär, UM890 Pro 32GB als Cold-Standby
- **Backup-Architektur:** 3-2-1 mit Standorten Berlin / Wohnmobil / Bremen-Eltern / optional Bremen-Cousin / Hetzner Storage Box (E2EE)
- **Standort-Realität:** Eltern Bremen = zeitlich begrenzt, Cousin Bremen-Umland = langfristige Alternative
- **Horizont:** 5-7 Jahre primär, 10 Jahre mit Hardware-Updates
- **Review:** Halbjährlich, erstes Review 2026-12-12
- **Nächste Schritte:** Hardware kaufen, Cold-Standby vorab konfigurieren, Hetzner Box anlegen, Wallet-Migration auf SLIP-39 (falls relevant), Backup-Skripte schreiben
- **Hardware-Budget:** ~€2.000-2.500 einmalig + ~€60/Monat laufend
- **Privacy-Architektur:** Local-First als Standard, Cloud nur für öffentliches Wissen + Frontier-Reasoning. Tool-Stack für Ollama, SearXNG, ProtonMail, Nextcloud, Joplin, Syncthing. Monatlicher Privacy-Audit geplant.

### AI-Model-Stack (für lokale LLMs)
- **Bekannter von Marcus** hat UM890 Pro 32GB als lokales KI-Setup
- **Pragmatischer Mix** für Marcus: Cloud (Claude/GPT-5) für komplexes Reasoning + lokal (32B-Modelle via Ollama) für Privacy/Volumen
- **Websearch kompensiert Knowledge-Cutoff teilweise** (~70% der Use Cases)
- **RAG-Pattern:** Ollama + Search-API (Tavily/Brave/SearXNG) als Standard-Architektur
- **Aktuell diskutierte Modelle:** Qwen 3 32B, Llama 4, DeepSeek V3/V4
- **GPT-5-Äquivalent in OSS:** Realistisch 2-4 Jahre, bis dahin Hybrid-Architektur

### 2026-06-12 - KI-Hardware-Diskussion
- Bekannter: Minisforum UM890 Pro 32GB als LLM-Setup
- **Wichtige Konzepte erklärt:** ROCm, Vulkan-Backend, 780M (iGPU-Hierarchie)
- **Hardware-Realität:** iGPU 780M/890M ist nutzbar aber limitiert; dedizierte GPU >> iGPU für LLM
- **eGPU via Oculink** möglich (RTX 3090 gebraucht ~€250), aber 24GB VRAM limitiert 70B
- **M3 Ultra mit 192GB unified memory** ist die einzige Single-Device-Lösung für 70B+ Q4 "snappy", aber €5.000
- **Open-Source-Modelle holen auf**, aber Knowledge-Cutoff + Trainingscompute bleiben Frontier-Vorteile
- **Diskussion mündete in Resilience-Planung** (Wohnmobil, geopolitische Sorgen)

### 2026-06-12 - KI-Hardware-Diskussion & Resilience-Planung
- Bekannter: Minisforum UM890 Pro 32GB als LLM-Setup
- **Wichtige Konzepte erklärt:** ROCm, Vulkan-Backend, 780M (iGPU-Hierarchie)
- **Hardware-Realität:** iGPU 780M/890M ist nutzbar aber limitiert; dedizierte GPU >> iGPU für LLM
- **eGPU via Oculink** möglich (RTX 3090 gebraucht ~€250), aber 24GB VRAM limitiert 70B
- **M3 Ultra mit 192GB unified memory** ist die einzige Single-Device-Lösung für 70B+ Q4 "snappy", aber €5.000
- **Open-Source-Modelle holen auf**, aber Knowledge-Cutoff + Trainingscompute bleiben Frontier-Vorteile
- **Privacy-Hauptantrieb:** Misstrauen gegen US-Cloud-Anbieter (CLOUD Act, FISA 702), EU-US DPF instabil
- **Lokal-First-Architektur** geplant: Ollama + SearXNG + ProtonMail + Nextcloud + Joplin + Syncthing
- **Wohnmobil** als Resilienz-Mobilität (Strom: 200Ah LiFePO4 + 400W Solar)
- **Wohnmobil-Strom 12V-Realität:** Mini-PC braucht 12V→19V-Wandler
- **Resilience-Doku:** `private/marcus-resilience-todo.md` (konsolidiert)
- **Community-Reconnection:** Longo Mai, contraste, Hitchwiki, Wwoofing, CCC, C-base
- **C-base Wuhle AI Meetup** als Aufhänger (niedrigschwellig, eigenes Format) — **Update 12.06.: Wuhle eingestellt, siehe nächster Abschnitt**
- **Scham/Isolation:** Phoenix hat vollen Kontext, soll ggf. einbezogen werden
- **Erste 3 Schritte:** AI X1 Pro recherchieren, Ollama-Modell wählen, ein Wochenende Wwoofing planen

### 2026-06-12 - C-base Wuhle → AI Enthusiasts (Status-Update)
- **Wuhle ist (vorerst) eingestellt** — eigenes Format hat sich nicht gehalten
- **Stattdessen:** Bestehendes **AI Enthusiasts**-Treffen in der c-base, **ab Mo 15.06.2026** regelmäßig besuchen
- **Maintainer: Sasquatch** — hat schon im c-base-Kontext einen **Server mit lokaler KI** laufen
- **Passt zu Marcus' Anliegen:** offene Diskussion über KI in der linken Szene, Hands-on, Ethik, lokale KI
- **Vorteil:** Niedrigschwelliger Einstieg in bestehende Community, kein eigenes Format aufbauen
- **Nächste Session:** Update zu AI Enthusiasts aufnehmen, ggf. mit Sasquatch Kontakt aufnehmen für Knowledge-Sharing (c-base lokaler KI-Server = ähnliche Architektur wie geplant)

### 2026-06-12 - TurboQuant/TurboVec in Tech-Stack integriert
- **TurboQuant** (Google Research, März 2026): Quantisierung-Algorithmus für LLM-Memory + Vector-Search
  - KV-Cache 16→3 bit = 6× weniger LLM-Speicher ohne Genauigkeitsverlust
- **TurboVec** (GitHub, ~1 Woche alt): Rust-Implementation, **31GB → 4GB Embeddings** (16×), schneller als FAISS
- **Qdrant 1.18+** hat TurboQuant nativ integriert (Mai 2026)
- **In Resilience-Doku eingebaut:** Sektion 11b dokumentiert Architektur-Vorteile
- **Konkrete Verbesserung:** 10M Chunks lokale Wissens-DB in 4GB, größere LLM-Kontextfenster, kürzere Inferenz-Zeit
- **Quellen:** research.google/blog/turboquant, arxiv.org/pdf/2504.19874, github.com/RyanCodrai/turbovec, qdrant.tech/articles/turboquant-quantization
- **TODO D erweitert:** Qdrant + TurboVec + Open WebUI als lokaler RAG-Stack

*Letzte Aktualisierung: 2026-06-12*

> **Refactor 2026-06-12:** Intime Sektionen (Wichtige Personen, Privat, Lebensgeschichte, Phoenix) aus MEMORY.md ausgelagert nach `private/marcus-personal-context.md`. Tiefenpsychologie-Notiz `memory/2026-04-13-depth-psychology.md` nach `private/memory/` verschoben. MEMORY.md enthält jetzt nur noch operative Notizen + 1-Zeilen-Verweise.

### 2026-04-21 - IDP Plattform Build (8 Stunden Session)

**Erfolg:** Komplette IDP auf kind Cluster gebaut + dokumentiert in einem Tag.

**Was installiert:**
- Flux, ArgoCD, Keycloak, OPA Gatekeeper, Trivy, kube-bench, Polaris
- Prometheus, Grafana, midPoint
- SOPS + Age (Secrets Management)
- GitHub Actions CI/CD Pipeline
- Ingress NGINX

**Wichtige Learnings:**
1. **Gatekeeper 3.15.0 buggy** → 3.14.0 nutzen
2. **kind hat keine LoadBalancer** → Nur NodePorts oder Port-Forwards
3. **SOPS + Age** ist besser als Sealed Secrets für GitOps
4. **Repo auf private gestellt** → Flux braucht GitHub Token

**Neue Repos:**
- `rook-k8s-lab` (IDP Plattform) - private
- `idp-customer-onboarding` (TODOs) - private

**Dokumente:** 23 Stück in rook-k8s-lab/docs/

**Nächste Schritte:**
- Flux GitHub Token konfigurieren
- ArgoCD Keycloak SSO fertigstellen
- Kundenspezifische Dokumentation
- Dashboard Widgets (Vulnerabilities)

---

## Aktuelle Projekte

### IDP Plattform (rook-k8s-lab)
- **Status:** Funktional, braucht noch Flux Token (Repo ist jetzt private)
- **Doku:** 23 Dokumente, alle mit Compliance-Referenzen (NIS2, BSI, ISO, DSGVO)
- **Link:** https://github.com/MarcusGraetsch/rook-k8s-lab

### IDP Customer Onboarding (idp-customer-onboarding)
- **Status:** TODOs erstellt, Workspace begonnen
- **Link:** https://github.com/MarcusGraetsch/idp-customer-onboarding
