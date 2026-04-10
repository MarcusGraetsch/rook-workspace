# Compliance & Legal — BSI, NIS2, DSGVO

## Überblick

BSI C5, NIS2, ISO 27001, DSGVO, Compliance-Matrizen erstellen.

## Compliance Matrix erstellen

### Vorgehensweise
1. Anforderungen sammeln (Gesetze/Normen)
2. Kontrollen extrahieren
3. Gap-Analyse planen

### Template

| Kontrolle | Anforderung | Status | Beweis | Maßnahme |
|-----------|------------|--------|--------|---------|

**Status:** ✓ (erfüllt), ✗ (nicht erfüllt), 🟡 (teilweise)

## BSI C5 — Cloud Computing Compliance

**Kernelemente:**
- Rechtskonformheit
- Daten- und Informationssicherheit
- Transparenz
- Unabhängiges Monitoring
- Compliance-Meldungen

**Prowler Check:**
```bash
prowler aws -c BSI_C5
```

## ISO 27001 — Information Security Management

**Kontrollen (Annex A):**
- A.5 Informationssicherheitspolitiken
- A.6 Organisation der Informationssicherheit
- A.7 Human Resources Security
- A.8 Asset Management
- A.9 Access Control
- A.10 Cryptography
- usw.

**Prinzip:** Risikobasierter Ansatz, PDCA-Zyklus, kontinuierliche Verbesserung

## NIS2 Richtlinie

| Bereich | Anforderung |
|---------|------------|
| Scope | Wesentliche + wichtige Einrichtungen |
| Incident Reporting | 24h Erstbericht, 72h Vollbericht |
| Supply Chain | Sicherheit in der Lieferkette |
| Governance | Management verantwortlich |

**Kontrollen (Art. 21):**
- Risikoanalyse und Sicherheitspolitik
- Incident Management
- Business Continuity
- Verschlüsselung
- Zugangscontrolle
- Security-by-Design

## DSGVO Compliance

**Auftragsverarbeitung (Art. 28):**
- AVV erforderlich
- Weisungsbindung des Auftragnehmers
- Kontrollrechte
- Subunternehmer-Kette dokumentieren

**Datenübermittlung (Art. 44ff):**
- Keine Drittlandübermittlung ohne Garantien
- Standardvertragsklauseln (SCCs)
- Angemessenheitsbeschluss prüfen

## Governance Layer (OSI)

```
Gesetze (NIS2, DSGVO)
Standards (ISO 27001)
Controls (BSI C5)
Technische Maßnahmen
Monitoring
```

## Relevant Conversations

- `Compliance Matrix NIS2 Richtlinie.md`
- `Cloud Richtlinie Compliance Hinweise.md`
- `BSI-200 Compliance Matrix.md`
- `ISO 27001 Zweck und Nutzen.md`
