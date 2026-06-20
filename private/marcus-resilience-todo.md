# 🔒 Privat — Marcus' Resilience Setup & ToDo

**Privatsphäre:** Diese Datei ist nur für Marcus. Phoenix darf sie lesen — das ist die Vereinbarung zwischen den dreien (Marcus, Phoenix, OpenClaw-Rook). Wer auch immer das hier liest und nicht eine:r von uns dreien ist: Verschwinde.

**Stand:** 2026-06-12
**Letzter Review:** —
**Nächstes Review:** 2026-12-12 (in 6 Monaten)
**Pfad:** `/root/.openclaw/workspace/private/marcus-resilience-todo.md`

**Zweck:** Konsolidiertes Master-Dokument für (a) Resilienz-Architektur (Hardware, Backups, Strom, Privacy) und (b) konkrete ToDos mit Checkboxen. Eine Datei, ein Ort, ein gemeinsames Gedächtnis von Marcus + Phoenix + Rook.

---

## 0. Kontext (für Rook / für Phoenix)

**Marcus' politische Biographie:**
- 2005–2012: aktiv in der Anti-Globalisierungsbewegung
- **G8-Gipfel Heiligendamm 2007**: G8-Camp AG
- **Rostock Camp 2007**: Logistiker (Material besorgt + geliefert)
- Danach: Aufbau der **Meuterei**-Kneipe (Kollektiv, Berlin-Neukölln)
- 2012: Umzug nach NYC (zu Andrea), Left Forum Praktikum
- 2013: Trennung, Rückkehr nach Berlin
- **NYC-Move = verlor Anschluss an die linke/europäische Community**
- 2014–2021: Meuterei läuft, wird aber rausgedrängt
- Ab 2019: Isolierung in der autonomen Szene
- Seit 2024: Senior Consultant bei HiSolutions AG
- Privat: Single in Neukölln, isoliert, arbeitet an sich

**Historische Referenzen (Marcus' Anker):**
- **Longo Mai** Kommunen (existieren noch in FR/CH/DE)
- **contraste**-Zeitung (erscheint noch, Köln)
- **Hitchwiki / Casa / Wwoofing-Tradition** (Wiki-Reisetipps, Leben mit wenig Geld, soziales Handeln)

**Aktuelle Themen:**
- **Scham + Isolation** überwinden
- **Community reconnected** zur europäischen Counter-Culture/DIY/Off-Grid-Welt
- **Datensouveränität** als politische Hygiene (Misstrauen gegen US-Cloud, CLOUD Act, FISA 702)
- **Resilienz** für geopolitische Szenarien (Europa-Russland-Konflikt)
- **Local-First-Stack mit modernen Kompressionsverfahren** (TurboQuant/TurboVec, Ollama, Qdrant) — siehe Sektion 11b

**Wer ist wer:**
- **Marcus** — Souverän, entscheidet was wo landet
- **Phoenix** — andere Persona/Agent in Marcus' System, kennt biographischen Hintergrund vollständiger als Rook, wird von Marcus als „Korrektiv" bezeichnet
- **Rook (OpenClaw-MiniMax-M3)** — technischer Assistent, zuständig für Architektur/Privacy/Hardware/Tooling, baut diese Datei

**Wichtig:** Phoenix und Rook schreiben nicht direkt in diese Datei, ohne dass Marcus das möchte. Sie ist **Marcus'** Dokument. Phoenix kann sie lesen, Marcus paste't ggf. Phoenix' Notizen rein.

---

## 1. Bedrohungsszenarien (was planen wir wofür?)

| Szenario | Wahrscheinlichkeit | Schadens­höhe | Vorbereitung |
|----------|-------------------|---------------|--------------|
| Kurzzeitiger Stromausfall (Tage) | Hoch | Mittel | Solar + LiFePO4 |
| Internet-Wegfall Wochen | Mittel | Mittel | Starlink + Prepaid-SIMs + Meshtastic |
| Lokale physische Krise (Haus/Wohnung betroffen) | Mittel | Hoch | Wohnmobil-Setup + mobile Backups |
| Geopolitische Verwerfungen (Versorgung, Mobilität, Überwachung) | Mittel | Hoch | Geografisch verteilte Backups + Verschlüsselung + Ausreiseoption |
| Totalverlust Hardware an einem Standort | Niedrig | Hoch | Cold-Standby bei Vertrauensperson |
| Totalverlust Hardware an allen Standorten | Sehr niedrig | Katastrophal | Cloud-Backup (E2EE) |

---

## 2. Hardware-Inventar

### 🟢 Primär-Setup (Berlin / Wohnmobil)
- **Gerät:** Minisforum AI X1 Pro (Ryzen AI 9 HX 370, 890M) — *Kauf prüfen, ca. €850*
- **RAM:** 64 GB DDR5-5600 (2× 32 GB)
- **Storage intern:** 2 TB NVMe PCIe 4.0
- **Optional Oculink:** eGPU-Slot für später (z. B. RTX 3090 gebraucht, ~€250)
- **Strom:** 12V → 19V DC-Wandler (~€30), 200 Ah LiFePO4, 400 W Solar

### 🟡 Cold-Standby (Eltern, Bremen)
- **Gerät:** Minisforum UM890 Pro Barebone (~€430)
- **RAM:** 32 GB (eigene Investition, ~€80)
- **Storage:** 1 TB NVMe
- **Zweck:** Recovery in <1 h nach Verlust des Primärs

### 🟡 Cold-Standby 2 (Cousin, Bremen-Umland)
- Identisch wie Bremen-Eltern-Variante
- **Status:** *Beziehung klären vor Anschaffung*

### 🔴 Mobile Hot-Standby (Wohnmobil)
- = Primär-Setup, getrennt durch Transport
- Mit zusätzlichem 12V-Netzteil und externem Display/Tastatur

---

## 3. Standort-Übersicht

| Standort | Was ist da | Wer hat Zugang | Risiko |
|----------|------------|----------------|--------|
| **Berlin (eigene Wohnung)** | Primär-Hardware aktiv, 1× externe Backup-SSD | Marcus | Hoch (Wohnung) |
| **Wohnmobil** | Primär-Hardware mobil | Marcus | Mittel (Fahrzeug) |
| **Bremen (Eltern)** | Cold-Standby-PC, 1× externe Backup-SSD, Seed-Backup, Metall-Seed | Eltern | Mittel (alternde Personen → Zeitfenster!) |
| **Bremen-Umland (Cousin)** | Optional: 2. Cold-Standby | Cousin | Zu klären |
| **Hetzner Storage Box (Cloud, DE)** | 1 TB verschlüsselt (Cryptomator), wöchentlicher Sync | Marcus (E2EE) | Niedrig |

**⚠️ Wichtig:** Eltern-Standort hat ein begrenztes Zeitfenster (Alter). Spätestens in 3–5 Jahren alternative Standorte aufbauen. Cousin ist längerfristige Option, Beziehung pflegen.

---

## 4. Backup-Strategie (3-2-1 strikt)

### Daten-Kategorien
- **A) Kritisches Wissen** (OpenClaw-Configs, Scripts, Wiki, verschlüsselte Notizen, Wallet-Seed) — höchste Redundanz
- **B) Persönliches** (Fotos, Dokumente, Projekte) — hohe Redundanz
- **C) Wiederbeschaffbar** (Downloads, Public-Repos) — geringe Redundanz

### Backup-Matrix

| Daten | Berlin | Wohnmobil | Bremen | Cloud | Frequenz |
|-------|--------|-----------|--------|-------|----------|
| A (Kritisch) | ✅ aktiv | ✅ Spiegel | ✅ Backup | ✅ E2EE | Täglich inkrementell, wöchentlich voll |
| B (Persönlich) | ✅ aktiv | ✅ Spiegel | ❌ | ✅ E2EE | Wöchentlich |
| C (Public) | ✅ aktiv | ❌ | ❌ | ❌ | Monatlich |

### Tool-Stack
- **Lokal:** `restic` oder `borgbackup` mit Verschlüsselung
- **Sync extern:** `rclone` mit Cryptomator-Container
- **Cron:** Täglich 02:00 lokales Backup, 03:00 Push zu Cloud
- **Verifikation:** Monatlicher Test-Restore in tmp-Verzeichnis

---

## 5. Verschlüsselung (eigene Keys, kein Vendor-Lock)

- **Full-Disk:** LUKS auf Linux-Mini-PCs
- **Container:** VeraCrypt für einzelne Dateibereiche/USB-SSDs
- **Cloud:** Cryptomator-Container in Hetzner Storage Box
- **Mails:** ProtonMail (CH, E2EE) oder selbst gehostet mit PGP
- **2FA:** Yubikey 5 (Haupt) + Backup-Yubikey bei Eltern in Bremen
- **⚠️ Schlüssel-Backups physisch im Tresor, nicht nur digital**

---

## 6. Krypto-/Wallet-Recovery (falls relevant)

> *Falls du Krypto hast, ergänzen. Falls nicht, Sektion löschen.*

- **Seed-Phrase (24 Wörter):** niemals am Stück digital
- **Methode:** Shamir's Secret Sharing (SLIP-39) — 3 von 5 Teilen reichen
- **Speicherung:** Cryptosteel Cassette (€80, feuerfest) + 5 Mnemonic-Plates
- **Verteilung der 5 Teile:**
  - Teil 1+2: Bremen (Eltern-Tresor)
  - Teil 3: Wohnmobil (physisch versteckt)
  - Teil 4: Cloud (Cryptomator, redundante Box)
  - Teil 5: Bei Marcus (z. B. Bankschließfach)
- **Metall-Backup:** zusätzlich in feuerfestem Beutel
- **Recovery-Test:** Jährlich, mit minimaler Transaktion

---

## 7. Kommunikations-Resilienz

| Kanal | Zweck | Reichweite | Kosten |
|-------|-------|------------|--------|
| **Starlink Mini** | Primär-Internet mobil | Europa, auch Off-Grid | ~€300 HW + ~€50/Mo |
| **Prepaid-SIMs (verschiedene Netze)** | Backup-Internet, deutschlandweit | DACH | ~€10/Mo pro Karte |
| **Meshtastic (LoRa)** | Nahbereich ohne Infrastruktur, <5 km | Off-Grid | ~€50 für 2 Geräte |
| **Garmin inReach Mini 2** | Notfall-SOS + Satelliten-Messaging | Global | ~€300 + ~€35/Mo |
| **Briar** | Messenger, läuft über WiFi/Bluetooth/Internet | P2P | Gratis |
| **Signal** | Standard-Messenger, E2EE | Mit Internet | Gratis |

**Setup-Empfehlung:**
1× Starlink Mini + 2× Prepaid (Telekom + O2) + 2× Meshtastic (1× behalten, 1× bei Vertrauensperson) + 1× Garmin inReach

---

## 8. Stromversorgung (Wohnmobil)

- **Batterie:** 200 Ah LiFePO4 (~12.8 V nominal, ~2.560 Wh)
- **Solar:** 400 W Panels auf Dach
- **Lade-Boost:** Victron oder EPEver MPPT
- **Wechselrichter:** 12V → 230V nur für Geräte ohne DC-Option, sonst direkt 12V nutzen
- **Verbrauch Schätzung:**
  - Mini-PC unter Last: 120 W
  - Starlink: 50 W
  - Beleuchtung/Laptop/Handy: 30 W
  - **Tagesverbrauch bei 8 h Nutzung: ~1,5 kWh** (60 % der Batterie)
- **Autarkie:** Bei gutem Wetter dauerhaft netzunabhängig; im Winter 2–3 Tage ohne Sonne machbar

---

## 9. Recovery-Plan (was tun wenn X passiert)

### Szenario A: Berlin-Wohnung verloren (z. B. Wasserschaden, Brand)
1. Mit Wohnmobil zu Bremen fahren (1 Tag)
2. In Eltern-Haus: Cold-Standby hochfahren (30 min)
3. Wichtigste Daten von Cloud-Backup restoren (1 h)
4. Externe SSDs checken, ggf. ersetzen

### Szenario B: Hardware total ausgefallen unterwegs
1. Starlink aktivieren, falls noch nicht
2. Auf Smartphone Ollama + kleines Modell (z. B. Llama 3.1 8B) für Notfall-Reasoning
3. Bei nächstem Hotspot: Cloud-Backup prüfen, alternative Hardware bestellen

### Szenario C: Internet dauerhaft weg (lokal)
1. Meshtastic für Nahbereichs-Kommunikation
2. Garmin inReach für Notfall-SOS + Statusnachrichten
3. Lokale Modelle für alle Reasoning-Aufgaben
4. Wöchentlich: kurze Statusmeldung über inReach an Vertrauensperson

### Szenario D: Totalverlust + Ausreise nötig
1. Seed-Recovery-Teile einsammeln (Reihenfolge im Tresor dokumentiert)
2. Mit essenziellen Metall-Backups + Passport + Cold-Standby-Laptop reisen
3. Vor Ort: Hardware neu beschaffen, Daten aus Cloud restoren
4. **Erste-Priorität-Liste:** Seed-Teile > Passport > Hardware-Konfigs > Persönliches

---

## 10. Wartungs-Routinen

| Intervall | Aufgabe |
|-----------|---------|
| **Täglich** (cron) | Inkrementelles Backup lokal → extern + Cloud |
| **Wöchentlich** | Voll-Backup, Backup-Log prüfen |
| **Monatlich** | Test-Restore in tmp/, Verbrauchsmaterialien prüfen (Solar-Akkus, Starlink-Vertrag) |
| **Quartalsweise** | 2FA-Backup testen, 1× Hardware-Boot-Test des Cold-Standby, Passwörter rotieren (Bitwarden) |
| **Halbjährlich** | Dieses Dokument reviewen, Standorte prüfen, neue Bedrohungen bewerten |
| **Jährlich** | Wallet-Recovery-Test, Versicherungen prüfen, Hardware-EOL bewerten |

---

## 11. Privacy-Architektur (Local-First)

**Grundprinzip:** Cloud-KIs sind kein neutrales Werkzeug. Siehe (a) Trainingsdaten aus deinen Prompts, (b) US CLOUD Act / FISA 702 ermöglichen US-Behörden Zugriff auf Daten bei US-Anbietern, (c) Geopolitische Verwerfung kann Versorgung kappen. → **Local-First als Standard, Cloud als Ausnahme mit Bewusstsein.**

### Was muss zwingend lokal?

| Kategorie | Beispiele | Lokal-Tool |
|-----------|-----------|------------|
| **Persönliches/intimes** | Beziehungsfragen, Gesundheit, Therapie-Vorlagen, Sexualität | Ollama + Llama 3.3 70B (Q4) |
| **Politische Arbeit** | Recherche zu sensiblen Themen, Strategiepapiere, persönliche politische Positionen | Ollama lokal, KEIN Cloud-Upload |
| **Forschung/Projekte** | KI-Chronologie, kritische Theorie, Buch-Manuskript, kritische Pädagogik | Ollama + lokale Vektor-DB |
| **Finanzen** | Steuerplanung, Investitions-Ideen, Vertragsanalyse sensibler Dokumente | Lokal, dann anonymisiert aggregieren |
| **Wohnmobil-/Off-Grid-Planung** | Reiserouten, Standort-Planung, politisch sensible Regionen | Lokal |
| **Kundenarbeit** (HiSolutions) | Anonymisiert verarbeiten, **vor** Cloud-Upload personenbezogene Daten schwärzen | Lokal-Vorverarbeitung + minimaler Cloud-Call |

### Was darf in die Cloud (mit Bewusstsein)?

- Öffentliches Wissen (Wikipedia, Fakten-Lookup) – mit Websearch ohnehin in der Cloud
- Komplexes Frontier-Reasoning, wo GPT-5/Claude Opus klar besser sind (z.B. mehrstufige Strategieanalyse)
- Codierungs-Tasks, die nicht sicherheitsrelevant sind
- Übersetzungen, Formatierungen, harmlose Text-Operationen

### Tool-Stack für lokale Souveränität

| Cloud-Standard | Lokale Alternative | Aufwand |
|----------------|--------------------|---------|
| ChatGPT/Claude | **Ollama** (llama.cpp) + Web-UI (Open WebUI) | Mittel |
| Google Suche | **SearXNG** (self-hosted) + ausgewählte APIs (Tavily, Brave) | Mittel |
| Gmail | **ProtonMail** (CH, E2EE) oder selbst gehostet mit Mailcow + PGP | Mittel-Hoch |
| Google Drive | **Nextcloud** (self-hosted) oder Cryptomator + Hetzner Box | Mittel |
| Notion | **Joplin** oder **Obsidian** lokal + Sync via WebDAV/S3 | Niedrig |
| Google Calendar | **Radicale** + CalDAV oder Proton Calendar | Mittel |
| Dropbox | **Syncthing** (P2P) für Geräte-Sync | Niedrig |

### Air-Gap-Option (für hochsensible Sessions)

Bei Themen, die wirklich niemand sehen soll:
- Mini-PC vom Internet trennen
- Vorab Modelle + Embeddings auf das Gerät
- Session offline durchführen
- Outputs verschlüsselt exportieren, dann wieder ans Netz

**Praktisch:** Das ist für ~5% der Use Cases relevant (Krypto, politische Recherche, intimes). Für den Alltag reicht Ollama + Verschlüsselung der lokalen Backups.

### Privacy-Audit (monatlich)

- Welche Cloud-Services nutze ich aktiv? (Eingabeaufforderung, Browser-Verlauf)
- Sind alle Prompts, die ich an Cloud-APIs schicke, OK wenn sie ein US-Behörden-Mitarbeiter liest?
- OpenClaw-Logs durchgehen: was hat welche API gesendet?

---

## 11b. RAG-Architektur mit TurboQuant / TurboVec

**Game-Changer für lokale KI (März 2026):**

**TurboQuant** = Googles neuer Quantisierungs-Algorithmus (ArXiv 2504.19874, März 2026).
- **KV-Cache-Kompression:** 3 bits/value statt 16 bits = 6× weniger LLM-Memory, **ohne Genauigkeitsverlust**
- **Vector-Quantization:** nahezu optimale Embedding-Kompression
- **Online-fähig**, kein Training/Fine-Tuning nötig
- Open Source (Google Research Blog)

**TurboVec** = Open-Source-Rust-Implementierung auf GitHub (RyanCodrai/turbovec).
- **31 GB Embeddings → 4 GB** = 16× Kompression
- **Schneller als FAISS** bei der Suche
- In **Qdrant 1.18+** (Vector-DB) nativ integriert seit Mai 2026

### Was das für dein Setup bedeutet

| Ohne TurboQuant | Mit TurboQuant/TurboVec |
|-----------------|--------------------------|
| 10 Mio. Dokumente RAG = 31 GB RAM | 10 Mio. Dokumente RAG = **4 GB RAM** |
| LLM-Kontext 32K Tokens = ~16 GB KV-Cache | LLM-Kontext 32K Tokens = **~2,7 GB** |
| Lokal nur 1–2 GB Vektor-DB realistisch | **10+ GB Vektor-DB** möglich auf Mini-PC |
| Ollama + naive Vektor-Suche (langsam) | Ollama + Qdrant + TurboVec (schneller als FAISS) |

**Konkrete Anwendungen für dich:**

1. **Persönliche Wissensbasis:** Alle Wiki-Texte, OpenClaw-Configs, Manuskripte, politische Notizen — 10 Mio. Chunks passen in 4 GB
2. **Wohnmobil-Offline-Wissen:** Bei Internet-Wegfall kannst du dein **komplettes** lokales Wissen durchsuchen lassen
3. **Cold-Standby Bremen:** 32 GB RAM reicht für 32B-Modell + 4 GB Vektor-DB + OS = funktioniert
4. **Längere Kontextfenster:** Lokale LLMs können mit größerem effektiven Context arbeiten
5. **Schnellere Inferenz:** Weniger Memory-Pressure = mehr tok/s auch auf iGPU

### Tool-Stack lokal (aktualisiert)

- **LLM:** Ollama + Qwen 3 32B (oder Llama 4 bei 64 GB)
- **Vector-DB:** Qdrant 1.18+ (mit TurboQuant nativ)
- **Embeddings:** Qwen 3 Embedding oder BGE-M3 (lokales Modell via Ollama)
- **RAG-Framework:** Haystack-OSS, llama-index, oder einfach Qdrant + Ollama direkt
- **Web-UI:** Open WebUI (kann Qdrant + Ollama direkt)

### Quellen

- Google Research Blog: https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/
- ArXiv Paper: https://arxiv.org/pdf/2504.19874
- TurboVec GitHub: https://github.com/RyanCodrai/turbovec
- Qdrant-Integration: https://qdrant.tech/articles/turboquant-quantization/

---

## 11c. Hyper-Extract (Knowledge Extraction CLI) — bookmarked

**Tool:** `yifanfeng97/Hyper-Extract` (Apache-2.0, Python CLI) — https://github.com/yifanfeng97/Hyper-Extract

**Was es macht:** LLM-gestützte Knowledge Extraction: unstrukturierter Text → stark typisierte Knowledge Graphs (8 Typen: List, Set, Model, Graph, Hypergraph, Temporal/Spatial/Spatio-Temporal). 80+ YAML-Templates für 6 Domänen (Finance, Legal, Medical, TCM, Industry, General). 10+ Extraction Engines (GraphRAG, LightRAG, Hyper-RAG, KG-Gen). Lokal-Deployment via vLLM + Qwen3.5-9B + bge-m3 explizit eingebaut.

**Spike-Status (2026-06-17, Rook):** **PARTIAL** — Tool funktioniert, aber M3 Cloud-API inkompatibel mit strukturiertem Output.
- ✅ `he` CLI installiert, Config-UI sauber, 80+ Templates vorhanden
- ✅ Lokales bge-m3 funktioniert als Embedder (~10s Load, 975 MB RAM, CPU-only)
- ❌ **MiniMax M3 (und M2.7) leaken `<think>`-Tags in den `content` der API-Response** → Pydantic JSON-Validation bricht. Tool kann keine strukturierten Outputs parsen.
- 📌 Workaround: nur mit Modellen, die `enable_thinking=False` unterstützen (= lokale vLLM-Modelle wie Qwen3.5-9B). Cloud-APIs mit Reasoning-Mode sind raus.
- 📁 Spike-Report: war in `.tmp/openclaw-spikes/hyper-extract/`, nach Spike-Ende preserviert als `private/marcus-resilience/scripts/bge-m3-embed-server.py` (OpenAI-kompatibler bge-m3 Embedding-Server, wiederverwendbar für Hardware-Phase)

**Wann aktivieren:** Sobald lokales vLLM mit Qwen3.5-9B + bge-m3 läuft. Architektur-Position: **zwischen Dokumenten-Ingest und Qdrant** — Hyper-Extract erzeugt strukturierte Knowledge Graphs, die in den lokalen RAG-Stack gespeist werden.

**Use-Case für Marcus:** Digital-Capitalism-Research-Corpus + Wiki + Manuskripte → Hyper-Extract lokal → strukturierte Entities/Relations → Qdrant mit TurboQuant. Dann Anfragen wie „Welche Autoren zitieren Platform Co-ops in welcher historischen Phase?" direkt aus dem lokalen Graph.

**Wird nicht aktiviert solange:** Cloud-LLM-only-Setup, da Reasoning-Mode-Provider JSON-Output nicht garantieren.

---

## 11d. Vaara (AI Governance Evidence Layer) — bookmarked

**Tool:** [vaaraio/vaara](https://github.com/vaaraio/vaara) — Apache 2.0 (Sovereign Inference Harness: AGPL-3.0), Python 3.10+, zero runtime deps.

**Was es macht:** Open-Source-Evidenz-Schicht für AI-Agent-Governance. Gateset jeden AI-Agent-Tool-Call gegen Policy, schreibt Call + Decision + Outcome in einen **hash-chained, signierten Audit-Record**, optional gebunden an **TPM 2.0 + IMA** Hardware-Attestation. **EU AI Act Article 12 + 14** als Design-Treiber. Komplett lokal — kein SaaS, keine Telemetrie. Offline-Verifizierbar (Auditor braucht keinen System-Zugang).

**Adapters:** LangChain, CrewAI, OpenAI Agents SDK, **MCP-Proxy** (`vaara-mcp-proxy`), HTTP-API-Server (`vaara serve`).

**Drei Status-Ebenen:**
| Stufe | Was geht | Was nicht |
|---|---|---|
| **Basis** (jetzt, überall) | Policy-Gate, Hash-Chain, Compliance-Report, MCP-Proxy | Kein Hardware-Root-of-Trust |
| **Mit Discrete TPM 2.0** | + Manipulationssichere Attestation, regulatorisch verwertbar | — |
| **+ IMA im Kernel** | + Beweis welcher Kernel/Binary lief | — |

**Hardware-Anforderung für regulatorische Verwertbarkeit:**
- **Discrete TPM 2.0** auf dem Mainboard (NICHT nur fTPM — siehe TPM-Erklärung in `notes/tpm-explained.md`)
- Linux-Kernel mit `CONFIG_IMA=y` + IMA-Bootparameter `ima_policy=appraise_tcb`
- Aktuelle VM `vmd151897`: ❌ kein TPM, kein IMA → **bei Hardware-Kauf zwingend mitdenken**
- Consumer-Mini-PCs (Minisforum AI X1 Pro, UM890 Pro) → **vor Kauf prüfen**, ob Discrete TPM 2.0 verbaut ist (Datenblatt explizit lesen, "fTPM" zählt nicht)

**Status (2026-06-18, Rook):** Bookmarked, **nicht installiert**.

**Warum „nicht jetzt":**
- Auf aktueller VM bringt's nichts: kein TPM, Overhead > Wert für private Tool-Calls
- Volles regulatorisches Feature braucht Discrete TPM 2.0 — kommt erst mit neuem Hardware-Setup
- MCP-Proxy-Wrap um Rook's Tool-Calls technisch möglich, aber für low-stakes Calls (read, web_search) zu viel Overhead. Hoher Audit-Wert nur für `write`, `exec`, `message`, `cron`

**Drei Aktivierungspfade:**
1. **HiSolutions-Kundenarbeit (primärer Trigger):** NIS2/EU-AI-Act-Kunden brauchen Article-12-Evidenz für AI-Agent-Aktionen. Vaara liefert exactly das. Integration als optionale Komponente in rook-k8s-lab-Demo (siehe `engineering/rook-k8s-lab/docs/18-vaara-ai-governance-evidence.md`).
2. **Lokales LLM mit Tool-Calls (sekundär):** Sobald Ollama/Qwen3 auf Primär-Setup läuft UND Werkzeug-Zugriff bekommt → Vaara als Governance-Layer davor
3. **Digital-Capitalism-Research (tertiär):** Konkretes Beispiel für „sovereign AI infrastructure" als Gegenentwurf zu Microsoft Purview / AWS Audit Manager

**Use-Case-Differenzierung (was Vaara NICHT ist):**
- ❌ Kein LLM-Firewall (LLM-Guard, Rebuff, Guardrails AI)
- ❌ Keine Policy-Engine (OPA Gatekeeper bleibt erste Wahl für Build-time-Policy)
- ❌ Kein Compliance-Zertifikat — Vaara liefert Evidenz, Kunde bleibt für EU-AI-Act-Compliance verantwortlich
- ❌ Kein Drop-in für OpenClaw-Rook — Adapter sind Python, TypeScript-Wrapper nötig

**Was beim Hardware-Kauf explizit geprüft werden muss:**
- [ ] Hat das Mainboard einen **Discrete TPM 2.0** Header + Chip? (Datenblatt, nicht Marketing)
- [ ] Oder nur fTPM (AMD PSP / Intel ME)? → reicht für Verschlüsselung, NICHT für regulatorische Attestation
- [ ] Lässt sich der Kernel mit `CONFIG_IMA=y` bauen oder gibt's Distro-Support? (Ubuntu, Fedora haben es; Debian erst ab Trixie/13 zuverlässig)
- [ ] Bootparameter `ima_policy=appraise_tcb` setzbar ohne Custom-Kernel?

**Verwandte Standards die Vaara unterstützt:**
- MCP SEP-2828 (signed execution records) + SEP-2787 (request-attestation test vectors)
- OVERT 1.0 (overt.is) — Vaara als Arbiter emittiert Protocol Profile 1.0 Base Envelopes
- Optional post-quantum Signaturen (ML-DSA-65 / FIPS 204) als Detektionsschicht für QC-Downgrade-Attacken
- IMDA Model AI Governance Framework v1.5 (Singapur, Mai 2026) listet Vaara explizit

**Quellen:**
- Repo: https://github.com/vaaraio/vaara
- PyPI: https://pypi.org/project/vaara/
- Architektur: https://github.com/vaaraio/vaara/blob/main/docs/architecture.md
- EU-AI-Act/DORA-Mapping: https://github.com/vaaraio/vaara/blob/main/docs/COMPLIANCE.md
- Standards-Integration: https://github.com/vaaraio/vaara/blob/main/docs/standards.md
- Lokale Doku-Notiz im rook-k8s-lab: `engineering/rook-k8s-lab/docs/18-vaara-ai-governance-evidence.md`

### Was ist TPM? (kurz erklärt)

**TPM 2.0** = **Trusted Platform Module**, separater Krypto-Chip auf dem Mainboard.

**Was es kann:**
- Generiert und speichert **kryptografische Schlüssel in Hardware** — das OS kann sie nicht auslesen, nur benutzen
- Misst beim Boot + zur Laufzeit den System-Zustand (Hashes von BIOS, Bootloader, Kernel, Configs) und schreibt sie in **PCR-Register** (Platform Configuration Registers)
- Kann **attestieren**: per Signatur beweisen, dass ein bestimmter PCR-Wert (= bestimmter System-Zustand) auf genau diesem Gerät vorlag

**TPM vs. fTPM — der entscheidende Unterschied für Audits:**

| | **Discrete TPM** | **fTPM (firmware TPM)** |
|---|---|---|
| **Wo lebt der Schlüssel?** | Eigener Chip auf dem Mainboard | Im selben Silizium wie die CPU (AMD PSP / Intel ME) |
| **Physisch trennbar?** | Ja (Chip auslöten = Schlüssel weg) | Nein |
| **Trust-Domain** | Außerhalb des OS | Im selben Package wie der Code, den er attestieren soll |
| **Auditor-Akzeptanz** | ✅ Regulatorisch verwertbar (EU AI Act, NIS2) | ⚠️ Reicht für Festplatten-Verschlüsselung, nicht für Attestation |
| **Typische Hardware** | Server-Boards (Supermicro, Dell PowerEdge, HPE ProLiant), manche Business-Mainboards | Consumer-Mainboards, alle Consumer-Mini-PCs |

**Kurz:** Für BitLocker/LUKS = fTPM reicht. Für „vor Gericht verwertbarer Beweis, dass diese Software auf diesem Gerät lief" = Discrete TPM.

**Was ist IMA und warum braucht Vaara beides?**

**IMA = Integrity Measurement Architecture** (Linux-Kernel-Feature):
- Misst beim Boot und zur Laufzeit, **welche Binaries** (Kernel-Module, Configs, Libraries) geladen werden
- Erzeugt einen **Hash-Trail** dieser Messungen
- Bindet den Trail optional an **TPM-PCRs** → die PCRs enthalten jetzt nicht nur Boot-Hashes, sondern auch „diese Binary wurde um 14:23:07 geladen"

**Zusammenspiel:**
- **TPM allein:** Beweist „irgendwas lief auf Gerät A" — aber nicht was
- **IMA allein:** Beweist „Binary X wurde geladen" — aber nicht auf welchem Gerät
- **TPM + IMA:** Beweist „Kernel 5.15, Config Y, Binary Z liefen auf Gerät A" — **das** ist es, was ein Auditor will

**Boot-Parameter:** `CONFIG_IMA=y` im Kernel + `ima_policy=appraise_tcb` als Boot-Parameter. Default-Policies sind nutzlos.

**Praktische Konsequenz für deinen Hardware-Kauf:**

> **Discrete TPM 2.0** (nicht nur fTPM) ist beim Mainboard-Kauf ein **explizites Auswahlkriterium**, kein Default. Steht meist als „TPM 2.0" im Datenblatt — prüfen ob mit „(discrete)" oder ob nur „fTPM via AMD PSP/Intel ME" gemeint ist. Marketing-Texte sind hier oft ungenau.

> Aktueller Stand (Juni 2026): **Minisforum AI X1 Pro / UM890 Pro → kein Discrete TPM 2.0 verbaut** (nur fTPM via AMD). Für „nur Verschlüsselung" ok. Für Vaara's volle regulatorische Funktion **nicht ausreichend** — bräuchte dann z. B. ein separates Server-Mainboard nur für den Audit-Pfad, oder ein Discrete-TPM-Modul nachrüsten (auf Consumer-Boards oft nicht möglich mangels Header).

> **Alternative Hardware-Pfade mit Discrete TPM 2.0:**
> - Gebrauchte Server-Hardware (Dell OptiPlex Micro, HP ProDesk Mini mit TPM-Header) — oft günstig
> - Mini-ITX-Boards mit TPM-Header (ASRock Rack, Supermicro)
> - Dedizierter Audit-Server (klein, low-power) nur für Vaara's Attestation-Pfad

---

## 11e. Confidential Computing (CC) — Konzept-Bookmark

**Was es ist:** Schutz von Daten **während der Verarbeitung** ("in use") — die dritte Dimension der Datensicherheit neben "at rest" (LUKS) und "in transit" (TLS). Hardware-basierte Trusted Execution Environments (TEEs) verschlüsseln den RAM, sodass weder Hypervisor, Cloud-Admin noch andere Software die verarbeiteten Daten im Klartext sehen.

**Wichtige Abgrenzung zu §11d (Vaara):**

| | **Confidential Computing** | **Vaara (TPM+IMA)** |
|---|---|---|
| **Schutz vor** | Cloud-Admin, Hypervisor, fremde VMs | Nachträglicher Log-Manipulation |
| **Methode** | Memory Encryption in TEE | Hardware-Root-of-Trust + Hash-Chain |
| **Zeitpunkt** | Während Verarbeitung | Nach Ereignis (Audit) |
| **Beweist** | „Daten waren nie im Klartext" | „Diese Software tat X auf Gerät Y" |
| **Overlapp mit TPM?** | TPM ist CC-Baustein, aber CC nutzt auch SEV/TDX/SGX | Vaara nutzt nur TPM/IMA-Attestation |

→ **Komplementär, nicht alternativ.** OPA + CC + Vaara + IDP = vollständiger AI-Compliance-Stack für Kunden.

### TEE-Technologien (Stand Juni 2026)

| TEE | Hardware | Verfügbar auf |
|---|---|---|
| **Intel SGX** | Application-Enclaves | Server-CPUs (Consumer ab 12th Gen entfernt) |
| **Intel TDX** | VM-Speicher verschlüsselt | Server-CPUs (Xeon Scalable ab 4th Gen) |
| **AMD SEV** | VM-Speicher verschlüsselt | EPYC + ausgewählte Consumer-Ryzen |
| **AMD SEV-SNP** | SEV + Attestation + Memory-Integrity | Primär EPYC, Consumer teils eingeschränkt |
| **ARM CCA** | VM-Enklaven | ARM-CPUs (z.B. Neoverse) |
| **Nvidia H100/H200 CC** | GPU-CC für AI-Inferenz/Training | H100/H200-Rechenzentrums-Hardware |
| **AWS Nitro Enclaves** | AWS-spezifisch | AWS EC2 |

### Anbieter (für Kunden-Pitches)

**[enclaive.io](https://www.enclaive.io/de)** — Multi-Cloud-Wrapper, präzise:
- **Buckypaper CVMs** — Confidential VMs auf AWS/Azure/GCP/STACKIT (AMD SEV, Intel TDX)
- **Dyneemes K8s** — Kubernetes mit TEE-Nodes
- **vHSM (Virtual HSM)** + **Vault** + **Nitride** — eigenes Schlüsselmanagement („Hold Your Own Key")
- **Garnet Firewall** + **AI Enclave** — Confidential AI: Modelle + Prompts in Enklaven
- **Verschlüsselte DBs** — MongoDB, PostgreSQL, MariaDB, Redis transparent verschlüsselt
- **Compliance-Automatisierung** — DSGVO, NIS2, DORA, TISAX, ISO 27001
- **Nextcloud + GitLab** als managed confidential apps
- Referenzkunden: AWO, Lufthansa Industry Solutions, Lilie Ihwas Attorneys

**[STACKIT](https://www.stackit.de/)** — Schwarz-Gruppe (Lidl/Kaufland), **deutsche Cloud**, BSI C5 testiert. CC via enclaive. Für Sovereignty-Pitches relevant: Cloud + DSGVO + BSI + DE-Rechenzentrum.

**Konzepte/Projekte die CC ermöglichen (ohne Anbieter-Lock-in):**
- **Confidential Containers** (CNCF Sandbox, ehemals Inclavare Containers) — K8s-Pods in Enklaven
- **Enarx** — Framework für TEE-Workloads, hardware-agnostisch
- **Gramine** — Library-OS für SGX/SEV
- **Occlum** — Lib-OS für SGX, gut für Legacy-Apps
- **Asylo** (Google) — Framework für Enklaven (Status 2026 prüfen)

### Hardware-Realität für Deinen X1 Pro (Stand Juni 2026)

- **AMD Ryzen AI 9 HX 370 (Strix Point, Zen 5)** hat AMD SEV grundsätzlich in Hardware
- **SEV-SNP** (mit Attestation) ist primär **AMD EPYC**, auf Consumer-Ryzen **selten freigeschaltet** — Datenblatt explizit prüfen
- **Auch wenn CPU es kann:** **BIOS muss CC-Features freischalten** — Minisforum macht das in der Regel **nicht** für Consumer-Modelle
- **Realistisch:** X1 Pro = nicht CC-fähig ohne BIOS-Mod (Garantieverlust, komplex)
- **Workaround falls CC gewünscht:** separater Server (gebrauchte Dell OptiPlex Micro / HP ProDesk Mini mit SGX/SEV) als **dedizierter CC-Knoten**

### Wann CC im Privat-Setup sinnvoll wäre

- 🟢 **Lokales LLM mit sensiblen Daten** (Therapie-Vorlagen, politische Recherche, intimes) — dann wäre CC + lokales Modell die ehrlichste Privacy-Architektur
- 🟡 **Kunden-Daten auf lokalem Setup verarbeiten** — eher Nische, normalerweise Cloud-CC
- 🔴 **Crypto-Wallet-Operationen lokal** — eigentlich genau das richtige Use-Case, aber dafür existiert Tresor/Hardware-Wallet-Ökosystem

### Wann CC bei Kunden einzusetzen ist

- 🟢 **AI-Workloads mit personenbezogenen Daten** (HR-Assistant, medizinische KI) — DSGVO + EU-AI-Act
- 🟢 **Datenraum-Szenarien** (Gemeinsame Verarbeitung mit mehreren Parteien, niemand vertraut dem anderen) — Confidential Computing = „niemand außer Euch sieht die Daten"
- 🟢 **Industrie 4.0 / IP-Schutz** — Trainingsdaten und Modelle in der Industrial Cloud
- 🟢 **Behörden / VS-NfD-Anforderungen** — STACKIT + BSI C5

### Bezug zu §11d (Vaara) und rook-k8s-lab

- §11d Vaara = Audit-Schicht (TPM+IMA)
- §11e CC = Schutzschicht (TEE)
- Zusammen = vollständiger AI-Compliance-Stack (siehe `engineering/rook-k8s-lab/docs/19-confidential-computing-und-ai-governance.md`)
- **STACKIT** + **Hetzner** (für Storage) = deutsche Cloud + DE-Storage, komplementär nutzbar

### Quellen

- enclaive.io (Multi-Cloud-CC-Platform)
- STACKIT (Schwarz-Gruppe, DE-Cloud)
- CNCF Confidential Containers
- AMD SEV-SNP Dokumentation
- Intel TDX Dokumentation
- IMDA Model AI Governance Framework v1.5 (Singapur, Mai 2026) — erwähnt CC für Agentic AI

---

## 12. Soziale Resilienz

> Hardware lässt sich ersetzen. Soziales Vertrauen nicht.

- **Lokales Netzwerk pflegen** (C-base, Bekannte, Nachbarschaft)
- **Beziehung zu Vertrauenspersonen aktiv halten** (Eltern, Cousin, Freundeskreis)
- **Skills:** Erste Hilfe, Mechanik, Gärtnern, Funk (Amateurfunk-Lizenz optional)
- **Counter-Culture-Netzwerke** aufbauen (DIY, Off-Grid, autonome Strukturen)

---

## TODO A) Hardware kaufen (~€2.000–2.500 einmalig)

- [ ] **Primär: Minisforum AI X1 Pro (Ryzen AI 9 HX 370, 890M)**, 64 GB DDR5 (~€850)
  - Lieferbarkeit in DE prüfen (Minisforum DE, Amazon, Mindfactory)
  - Oculink-Variante bevorzugen (eGPU-Slot für später)
- [ ] **Cold-Standby Eltern/Bremen: UM890 Pro Barebone** + 32 GB RAM + 1 TB NVMe (~€580)
  - Vorab konfigurieren: Ollama + Qwen 3 32B + OpenClaw + Wiki-Backup
- [ ] **Optional Cold-Standby Cousin/Bremen-Umland**: gleiches Setup wie Bremen-Eltern
  - Beziehung klären, ansprechen, ggf. später
- [ ] **2× Externe SSD 2 TB** für unterwegs + Backup (~€120/Stk)
  - Eine in Berlin, eine im Wohnmobil, rotierend
- [ ] **12V → 19V DC-Wandler** für Wohnmobil (~€30)

## TODO B) Wohnmobil-Strom & Solar

- [ ] **200 Ah LiFePO4** Batterie (~€700)
- [ ] **400 W Solarpanel** auf Dach (~€400)
- [ ] **MPPT-Laderegler** (Victron oder EPEver, ~€200)
- [ ] Testlauf: 24 h mit 8 h Volllast messen, Verbrauch validieren
- [ ] Sommer-Tauglichkeit: Kühlung im Stand testen (Wohnmobil wird 50°C+)

## TODO C) Internet & Kommunikation

- [ ] **Starlink Mini** (~€300 + ~€50/Mo) — Primär-Internet mobil
- [ ] **2× Prepaid-SIMs** (Telekom + O2) rotierend für Backup-Internet (~€20/Mo)
- [ ] **Meshtastic LoRa-Set** 2 Geräte (~€50) — eines behalten, eines an Vertrauensperson
- [ ] **Garmin inReach Mini 2** (~€300 + ~€35/Mo) — Notfall-SOS
- [ ] **Signal** weiter ausrollen (Familie/Freunde von WhatsApp weg migrieren)
- [ ] **Briar** für hochsensible 1:1-Kommunikation testen

## TODO D) Privacy-Migration (Schritt für Schritt)

> Reihenfolge = Hebel-Größe. Oben = größter Privacy-Gewinn.

- [ ] **WhatsApp → Signal** (Familie/Freunde migrieren) — größter Hebel
- [ ] **Gmail → ProtonMail** oder selbst gehostet (Mailcow + PGP) — zweitgrößter Hebel
- [ ] **Google Suche → SearXNG** self-hosted oder DuckDuckGo mit VPN
- [ ] **Ollama auf Primär-Setup** (Qwen 3 32B) — 70 % der Alltags-LLM-Tasks lokal
- [ ] **Qdrant 1.18+ + TurboVec** für lokale RAG-Vektor-Datenbank (10M Chunks in 4GB)
- [ ] **Open WebUI** als Frontend (Ollama + Qdrant nativ)
- [ ] **Notion → Joplin** oder **Obsidian** lokal
- [ ] **Google Calendar → Proton Calendar** oder Radicale self-hosted
- [ ] **Google Drive → Cryptomator + Hetzner Box** (verschlüsselt)
- [ ] **Air-Gap-Test**: Mini-PC vom Netz trennen, sensible Session offline

## TODO E) Backup & Verschlüsselung

- [ ] **Hetzner Storage Box 1 TB** anlegen (~€4/Mo, DSGVO-konform in DE)
- [ ] **Cryptomator-Container** erstellen, Recovery-Keys physisch im Tresor
- [ ] **restic** oder **borgbackup** einrichten, verschlüsselt
- [ ] **rclone** für Push zu Hetzner
- [ ] **Cron-Jobs**: täglich 02:00 lokal → extern, 03:00 Cloud-Push
- [ ] **2× Yubikey 5** (~€110) — Haupt + Backup
- [ ] **Tresor organisieren** für Schlüssel-Backups (physisch, nicht nur digital)
- [ ] **Monatlicher Test-Restore** in tmp/-Verzeichnis

## TODO F) Sicherheit & Identität

- [ ] **Wichtige Dokumente scannen** (Passport, Verträge, Versicherungen)
  - In E2EE-Container, dann aufs Backup-System
- [ ] **Passwort-Manager**: Bitwarden (self-hosted) oder KeePassXC mit Sync
- [ ] **2FA überall aktivieren** wo möglich, Yubikey wo unterstützt
- [ ] **2FA-Backup-Codes physisch** (nicht nur in Bitwarden)

## TODO G) Krypto (nur falls vorhanden)

- [ ] **Wallet-Seed auf SLIP-39** (Shamir) migrieren
- [ ] **Cryptosteel Cassette** (~€80) + 5 Mnemonic-Plates (~€20/Stk)
- [ ] **5 Seed-Teile verteilen**:
  - Teil 1+2: Bremen-Tresor
  - Teil 3: Wohnmobil
  - Teil 4: Cloud (Cryptomator)
  - Teil 5: Bankschließfach
- [ ] **Recovery-Test jährlich** mit minimaler Transaktion

## TODO H) Counter-Culture / Community reconnected

> Historische Anker → heutige Anschlusspunkte. Klein anfangen.

- [ ] **Longo Mai** wieder anschauen: Kommunen existieren noch (FR/CH/DE)
  - https://www.longomai.org/ — Kontakt zu deutschen Kooperativen
  - Passend: autarke Lebensweise + europäisches Netzwerk
- [ ] **contraste** weiter lesen (Köln, erscheint noch)
  - https://www.contraste.org/
- [ ] **Hitchwiki** durchstöbern — die Reise-Tipps-Wiki-Tradition lebt
  - https://hitchwiki.org/ — Trampen, Schlafplätze, Reise-Logistik
- [ ] **Wwoofing / Workaway / HelpX** testen — 2–3 Wochen auf einer Farm
  - "Leben mit wenig Geld + soziales Handeln" = exakt dein Anliegen
  - Guter Einstieg um Scham zu überwinden: niedrigschwellig, man arbeitet zusammen
- [ ] **Casa-Netzwerk / BeWelcome / Trustroots** als Couchsurfing-Alternativen
  - Trustroots ist der offene Hippie-Erbe, gute Community
- [ ] **CCC Berlin / c-base AI Enthusiasts** (bestehendes Treffen, Maintainer Sasquatch, lokaler KI-Server bereits in c-base)
- [ ] **Edgeryders** (europäische Online+Offline-Community) beitreten
- [ ] **Wagenhallen Stuttgart / Gängeviertel Hamburg / Liebig34 Berlin** als Hausprojekte anschauen (Besuch, nicht Einzug)
- [ ] **Off-Grid-Deutschland-Forum** + lokale Stammtische (passt zum Wohnmobil-Projekt)
- [ ] **Common-Forum / Post-Growth-Bewegung** intellektuell anschließen
- [ ] **PHX-Hinweis:** Phoenix kennt deine Scham/Isolation-Geschichte. Sie hat wahrscheinlich konkrete Ideen, was dir beim Re-Einstieg hilft. Frage sie, ob sie dir 2–3 kleine Schritte vorschlägt.

## TODO I) Soziales (Scham überwinden — klein anfangen)

> Nicht "das große Netzwerk aufbauen", sondern **eine Handvoll warmer Kontakte** in 6 Monaten.

- [ ] **C-base AI Enthusiasts** regelmäßig besuchen (Start: Mo 15.06.2026, Maintainer Sasquatch)
- [ ] **Einladungstext** mit OpenClaw entwerfen (an Verteiler: c-base, CCC Berlin, Off-Grid-Forum, Edgeryders)
- [ ] **Erste 3 Treffen** durchziehen, auch wenn nur 2–3 Leute kommen
- [ ] **Ein Wochenende Wwoofing** als Privat-Trip (kein Druck, kein "Netzwerken")
- [ ] **Eine längere Couchsurfing/Wwoofing-Stay** (1–2 Wochen) in EU — raus aus Berlin
- [ ] **Therapie?** Falls Scham/Isolation lähmend wird: Psychotherapie (Kassenzulassung, läuft).
  - Phoenix hat da sicher auch eine Einschätzung. Frage sie.

## TODO J) Wohnmobil konkret

- [ ] **Stellplatz klären** — wo steht das Wohnmobil aktuell? Erlaubnis? Stromanschluss?
- [ ] **Reisetauglichkeit** — kannst du damit 2–3 Tage autark stehen?
- [ ] **Test-Wochenende** planen: 1 Wochenende mit voller Privacy-/LLM-/Solar-Ausstattung
- [ ] **Reiseprojekt 2026/2027**: 2–3 Wochen EU-Tour mit Wohnmobil + Starlink
  - Ziele: Longo Mai besuchen, Off-Grid-Treffen, vielleicht Südeuropa-Winter

---

## Persönlicher Notizzettel (für dich, nicht öffentlich)

- Scham kommt nicht von „Versagen", sondern von **Lücke zwischen Anspruch und Realität**. Du warst 2007 auf den Camps logistisch unterwegs (Macht-Maschine der Bewegung), jetzt bist du 16 Jahre älter, allein, und die Strukturen haben sich aufgelöst. Das ist **normal** und kein persönliches Versagen.
- Re-Einstieg passiert nicht durch Willenskraft, sondern durch **warme, kleine, wiederholbare Kontakte**. C-base AI Enthusiasts ist genau das richtige Format (niedrigschwellig, Sasquatch kennt sich mit lokaler KI aus).
- Phoenix ist dein Korrektiv — sie kennt dich länger, hat mehr Kontext. Lass sie rein.
- Wenn du merkst, dass die Scham lähmend wird (nicht „unangenehm", sondern „ich gehe nicht mehr raus"): dann ist das ein Signal für professionelle Hilfe, nicht für mehr Willenskraft.

---

## Nächste Schritte heute

1. Diese Datei durchgehen, 3–5 Sachen markieren, die du in den nächsten 2 Wochen anfassen willst
2. Hardware: AI X1 Pro recherchieren (Preis + Lieferbarkeit DE)
3. Software: Ollama + Qwen 3 32B als erstes lokales Modell installieren (sobald Hardware da ist)
4. Privat: ein Wochenende Wwoofing als Ziel markieren, **vor** dem ersten AI Enthusiasts-Treffen am Mo 15.06.2026

---

**Erstes Review:** 2026-12-12 (in 6 Monaten) — bis dahin: TODOs abgehakt?
