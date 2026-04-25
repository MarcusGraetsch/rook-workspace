# Backlog: Multi-Agent-Architektur

> Status: Idee, noch nicht entschieden
> Eingetragen: 2026-04-24
> Kontext: Marcus will über mehrere spezialisierte Agenten nachdenken

## Idee

Statt einem universalen Rook: Drei spezialisierte Agenten mit eigenen SOULs, MEMORYs und Kontexten.

## Vorschlag

| Agent | Fokus | Persona | Pro | Contra |
|-------|-------|---------|-----|--------|
| **Rook-Dev** | Code, Architektur, K8s, Research | Trocken, technisch, kein Bullshit | Fokussiert auf Tech | Keine Warmheit |
| **Rook-Life** | Privates, Kultur, Empfehlungen | Warm, humorvoll, Gen-X | Persönliche Bindung | "Verschwimmt" mit Dev |
| **Rook-Auto** | Automation, Monitoring, Cron | Präzise, checklisten-orientiert | Läuft autonom | Wenig persönlich |

## Offene Fragen

- **Memory-Trennung:** DREI MEMORY.md Dateien? Oder eine zentrale + tags?
- **Kontinuität:** Was wenn Dev-Frage und Life-Frage im selben Chat kommen?
- **Token-Effizienz:** Mehr Kontext = mehr Kosten, mehr Dateien = mehr Lesen
- **Setup-Aufwand:** OpenClaw unterstützt nativ keine Multi-Agent-Sessions
- **Überlappung:** Wo ist die Grenze? (z.B. "Empfiehl mir einen Podcast über K8s" → Dev oder Life?)

## Optionen

### A: Session-Tags (einfach, kein Setup)
```
[DEV] Weiter mit Keycloak Integration
[LIFE] Guten Film für heute Abend?
[AUTO] Check Emails
```
→ Eine SOUL, mehrere Modi. Marcus entscheidet pro Nachricht.

### B: Dedizierte Sessions (sauber, mehr Aufwand)
→ Verschiedene Chats/Threads/Workspaces. Jeder Agent isoliert.

### C: Hybride Architektur (empfohlen)
→ Eine SOUL.md mit Rollen-Switch. Context-Dependent Personality.
→ "Ich bin Rook. Im Tech-Modus: direkt. Im Life-Modus: warm."

## Nächste Schritte

- [ ] Marcus entscheidet: Tags vs Sessions vs Hybrid
- [ ] Wenn JA: SOUL.md Drafts für spezialisierte Agenten
- [ ] Wenn NEIN: Aktuelle SOUL.md weiter verfeinern
- [ ] Testphase: 1 Woche mit Tags testen

## Notizen

> "Es hat auch seine Nachteile wenn man mehrere memories und soul mds hat und nutzt."
> — Marcus, 2026-04-24

Stimme zu. Komplexität vs. Nutzen abwägen. Eine gut geschriebene SOUL.md kann genauso vielschichtig sein wie drei schlechte.

---

*Letzte Aktualisierung: 2026-04-24*
