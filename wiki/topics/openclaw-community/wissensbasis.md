# OpenClaw Community Intelligence

> Stand: 2026-04-10 | Quellen: Reddit, GitHub, ClawHub, Answer Overflow (Discord), Presse

---

## 🌍 Überblick — Das Ökosystem

| Kanal | Aktivität |Ton |
|-------|-----------|-----|
| Reddit r/openclaw | Sehr aktiv, viele How-Tos, Release-Diskussionen | Hilfsbereit, pragmatisch |
| GitHub openclaw | 247k Stars, 47.7k Forks (März 2026), 1.200+ Contributors | Technisch, schnell |
| Discord ("Friends of the Crustacean") | Sehr aktiv, Q&A, Skill-Sharing | Freundlich, locker |
| ClawHub | 5.400+ Skills, wachsende Plugin-Landschaft | pragmatisch |
| Presse | Viral seit Feb/Mär 2026 (NYT, Forbes, VentureBeat) | — |

---

## 👤 Key Actors — Wer sind die wichtigen Leute?

### Gründer / Lead Developer
- **Peter Steinberger** — Österreichischer Entwickler, hat OpenClaw 2025 als "Clawdbot" gestartet. Im Feb 2026 zu OpenAI gewechselt, leitet jetzt deren "personal agents division". Die Übergabe an die Community/Foundation läuft.

### Core Team / Maintainer
- Community-geleitetes Modell seit Steinbergers Wechsel
- Offizielle Contributors auf GitHub
- **NVIDIA** — hat **NemoClaw** gebaut (März 2026): Security-Wrapper für OpenClaw, "managed inference", ab 16. März 2026 in Early Preview verfügbar. **Wichtiger Player.**

### Skill/Plugin-Entwickler (Community)
| Name | Was | Bemerkenswert |
|------|-----|---------------|
| **chunhualiao** | OpenClaw Use Case Catalog | Kuratiert Use Cases, ClawHub |
| **ethanbeard** | ClwNet (ClawNet) | Email/Calendar/Contacts via Gateway-Plugin |
| **kings0527** | Todoist CLI Skill | Productivity-Integration |
| **buddyh** | Todoist CLI | Alternativ-Plugin |
| **Fashionzzz** | OpenClaw每日资讯汇总 | Daily News Aggregation (chinesisch) |
| **salmonrk** | openclaw-comfyui | ComfyUI-Integration (local) |
| **dihan** | comfy-ui | ComfyUI-Skill (local) |

### Presse/Akademie
- **Matt Schlicht** — Entrepreneur,启动了 Moltbook (AI-agent soziales Netzwerk), eng mit OpenClaw-Ökosystem verbunden
- Verschiedene Medien (NYT, Forbes, KDnuggets, VentureBeat, LogRocket)

---

## 📜 Geschichte & Meilensteine

### 2025 — Die Anfänge
- **Peter Steinberger** launcht erste Version als **Clawdbot**
- Schnelles Wachstum durch Viralität

### Early 2026 — Die Umbenennung
- **Namensänderung**: Erst zu **Moltbot** (Markenrecht), dann zu **OpenClaw**
- Steinberger tritt bei **OpenAI ein** (Feb 2026) — leitet jetzt persönliche Agents
- OpenClaw geht an **unabhängige Open-Source-Foundation** mit OpenAI-Backing

### Feb–Mär 2026 — Viralität
- **247.000 GitHub Stars** (März 2026)
- NYT und Forbes berichten über China-Adoption
- Chinesische Entwickler adaptieren OpenClaw für **DeepSeek** und **WeChat**
- **Tencent** und **Z.ai** announcieren OpenClaw-basierte Services

### März 2026 — Neue Produkte/Features
- **NVIDIA NemoClaw** (März 16) — Security Wrapper, managed inference, Early Preview
- **SwarmClaw** — Multi-Agent-Orchestration, OpenClaw-basiert
- **OpenClaw-RL v1** (Feb 26) — RL Framework für Training von Agents aus natürlicher Konversation
- **ClawCloud** — Hosting-Service für OpenClaw-Instanzen

### April 2026 — Reife
- Version **2026.4.x** (aktuell 2026.4.10 vom 8. April)
- Stabilitätsprobleme in 2026.4.5 → 2026.4.9 (Gateway Restarts, Memory Leaks)
- Neue Plugin-Infrastruktur (SDK Surface Updates)
- Community-Governance öffentlich auf GitHub

---

## 🚀 Game Changer — Was hat die Entwicklung beschleunigt?

### 1. **OpenAI Foundation + Steinberger's Wechsel**
OpenAI Backed Foundation + Steinberger bei OpenAI = Credibilität + Ressourcen. Das hat das Projekt auf eine neue Stufe gehoben.

### 2. **NVIDIA NemoClaw** 
Managed inference + Security für Unternehmensausrollen. Der wichtigste Enterprise-Connector.

### 3. **ClawHub als Skill Marketplace**
5.400+ Skills, Skill-Ökonomie etabliert sich. Skills sind der App-Store-Moment.

### 4. **China-Adoption + WeChat Integration**
 riesige neue Nutzerbasis in China. DeepSeek-Modell-Support. Das hat die Nutzerzahlen explodieren lassen.

### 5. **Multi-Agent Orchestration (SwarmClaw)**
Agent-to-Agent Delegation, Sessions, Skills, Schedules — das macht aus einem Chatbot eine echte Plattform.

---

## 🛠 Neue Skills & Plugins (Feb–Apr 2026)

### Productivity
- **Todoist CLI** (clawhub.ai/buddyh/todoist-cli) — Todoist via CLI, kein Browser nötig
- **openclaw-todoist** (clawhub.ai/kings0527/openclaw-todoist) — Alternative Todoist-Integration
- **Lark CLI** (clawhub.ai/plugins/openclaw-plugin-lark-cli) — ByteDance's Lark/Feishu Suite

### Memory & Knowledge
- **Supermemory** (clawhub.ai/plugins/openclaw-memory-supermemory) — Externes Memory-Plugin
- **OpenClaw Use Case Catalog** — Kuratierte Use-Case-Sammlung mit Findings

### Communication
- **ClwNet** (ClawNet) — Email/Calendar/Contacts-Plugin via Gateway
- **WeChat/Tencent** — Offizielles WeChat-Plugin (openclaw-weixin)
- **WhatsApp** — Multi-User mit unique IMAP-Accounts (Discord diskutiert)

### Infrastructure
- **Mission Control** — Dashboard zur Visualisierung und Steuerung von OpenClaw-Setup
- **Trakt** (clawhub.ai/plugins/trakt-tools) — Watch-tracking
- **OnChainClaw** — Blockchain/0G AI Integration (⚠️ Confusing naming, needs verification)

### Automation
- **Foundry VTT Module** — REST API → OpenClaw Skill für Tabletop-Automation
- **OpenClaw-RL** — Reinforcement Learning Training Framework
- **OpenClaw每日资讯汇总** — Daily News Aggregator (chinesisch)

### Image/Generation
- **comfy-ui** (dihan) — Lokale ComfyUI-Ansteuerung
- **openclaw-comfyui** (salmonrk) — Alternative ComfyUI-Integration
- **Creative Toolkit** (jau123) — No-API-Key-Modus, GPT Image, ComfyUI Auto-Detection

---

## 📋 How-Tos & Best Practices (aus Community-Feedback)

### Setup/Installation
1. **Frische Debian-Installation**: `openclaw onboard` — neueste Provider auswählen, bestehende Settings bleiben erhalten
2. **Docker**: ⚠️ Warnung bei 2026.3.13 (kaputte Version, fix: v2026.3.13-1 tag)
3. **Nach Update**: `openclaw doctor --fix` sofort ausführen
4. **Windows**: Ein-Zeilen-Installer funktioniert nicht immer → Linux/WSL empfohlen

### Model Provider
- **Neuen LLM Provider hinzufügen**: `openclaw onboard` erneut starten, neuer Provider wird default
- **Default Model / Fallback-Reihenfolge**: über CLI oder Config setzen
- **Kosten-Optimierung**: Routing für günstigere Modelle konfigurieren (Community-Tipp)

### Skills
- Skills müssen im **default agent workspace** sein um gesehen zu werden
- **Security**: Nur vertrauenswürdige Skills installieren; bei zweifelhaften Dateien → Malware-Scanning
- **Nach Update**: Workspace Skill-Pfade können sich ändern → `openclaw skills list` prüfen

### Community-Empfehlungen (Reddit)
> "Run `openclaw doctor --fix` first thing after upgrading."
> "You don't need a Mac Mini. You don't need Docker. Here's what you actually need to run OpenClaw."
> "2.2 to 4.8 is probably ok but ask your agent to read the release notes between versions for red flags."

---

## ⚠️ Aktuelle Probleme / Caveats (April 2026)

| Problem | Betrifft | Workaround |
|---------|---------|-----------|
| **Memory Leak** in 2026.4.9 | Linux, Gateway RSS steigt abnormal | 2026.4.10 sollte fixen |
| **Gateway Restarts** in 2026.4.5 | Mac Studio M3 Ultra, BlueBubbles | Upgrade oder Downgrade |
| **Post-Update Cache Refresh Fail** | 2026.4.9 | QA scenario pack bug, Issue #63768 |
| **Docker 2026.3.13** | Docker-User | Fix via v2026.3.13-1 Tag |
| **Ollama local models** | Frische Debian-Installation | Funktionieren nicht out-of-the-box |

---

## 🔮 Potentiell Interessant für Marcus

| Thema | Warum relevant | Quelle |
|-------|---------------|--------|
| **OpenClaw-RL** | Personalisierte Agents trainieren | GitHub/Gen-Verse |
| **Mission Control Dashboard** | Eigenes Dashboard bauen (参照 TenacitOS) | Discord/Answer Overflow |
| **Todoist Integration** | Health Agent Tasks | ClawHub |
| **WeChat Plugin** | Falls China-Kontakte relevant | Offizielles Plugin |
| **NemoClaw** | Enterprise Security (falls mal wichtig) | NVIDIA |
| **SwarmClaw** | Multi-Agent Orchestration | GitHub |

---

## 🔗 Wichtige Links

- **GitHub**: https://github.com/openclaw/openclaw
- **ClawHub**: https://clawhub.ai
- **Discord Community**: "Friends of the Crustacean 🦞🤝"
- **Answer Overflow**: https://www.answeroverflow.com/c/1456350064065904867
- **Reddit**: r/openclaw, r/OpenClawCloud, r/AiForSmallBusiness
- **OpenClaw Use Case Catalog**: clawhub.ai/chunhualiao/openclaw-usecase-catalog
- **Mission Control**: github.com/builderz-labs/mission-control
- **OpenClaw-RL**: github.com/Gen-Verse/OpenClaw-RL
- **NemoClaw**: github.com/NVIDIA/NemoClaw

---

*Zuletzt aktualisiert: 2026-04-10*
