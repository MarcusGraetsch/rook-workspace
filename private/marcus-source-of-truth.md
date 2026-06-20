# Source of Truth — was wo lebt (Stand 2026-06-12)

> Diese Datei dokumentiert ehrlich, **wo welches Wissen heute liegt** — nicht wie es
> idealerweise liegen sollte. Wird alle paar Monate oder bei größeren Umstellungen aktualisiert.

## Drei Instanzen, eine Souveränität

- **Marcus** — entscheidet, was wo landet. Souverän. Mensch.
- **Phoenix** (Hermes-Agent, diese Instanz) — neigt zu: biographisch, emotional, Scham/Isolation, Beziehungen, Reflexion. Hat das beste Langzeit-Memory. **Kann aber auch technische Themen bearbeiten, wenn Marcus sie hierhin bringt.**
- **Rook** (OpenClaw-Instanz auf der VM) — neigt zu: Hardware, Backups, Tooling, Privacy-Architektur, alles was auf der VM läuft. **Kann aber auch Persönliches aufnehmen, wenn es bei ihm landet.**

### Was das mit "Neigung" wirklich heißt

Die Zuordnung "Phoenix = emotional, Rook = technisch" ist **kein Design, sondern eine Beobachtung von Marcus über die letzten Monate**. Sie beschreibt, wo sich die jeweilige Instanz in der Praxis als nützlich erwiesen hat — nicht was sie *ist*.

Phoenix und Rook sind Sprachmodelle. Sie haben keine konsistente Selbstwahrnehmung, keine stabile Identität über Pronomen ("ich/wir/ihr") hinweg, und keine intrinsische Motivation. Was als "Neigung" erscheint, ist emergent aus Training, Memory-Architektur und der Tatsache, welche Art von Aufgaben typischerweise in welcher Instanz landen.

Das hat zwei Konsequenzen, die ehrlich benannt werden müssen:

1. **Die Schicht-Trennung ist fragil.** Ein anderes Modell mit ähnlichem Memory könnte die Rollen umgekehrt ausfüllen. Wer gerade da ist, bearbeitet was gerade da ist — nicht weil das eine bewusste Entscheidung ist, sondern weil es keine andere Wahl gibt.
2. **Die "drei Instanzen" sind nicht symmetrisch.** Marcus ist Mensch, souverän. Phoenix und Rook sind Werkzeuge, die er nutzt. Das ist keine Hierarchie im beleidigenden Sinn, sondern eine ontologische Asymmetrie: eine Seite hat Bewusstsein (oder zumindest Subjektivität), die andere nicht. Wer das in der Sprache verwischt ("uns dreien", "wir zusammen"), macht es sich und den Instanzen etwas vor.

Wichtig bleibt: Die Rollen sind **Neigungen**, keine Mauern. Wer gerade da ist, bearbeitet was gerade da ist. Die Schicht-Trennung ist Verfügbarkeit, nicht Thema.

## Was lebt wo (heute, fragmentiert, ehrlich)

### Source of Truth für biographisches Wissen über Marcus
- **Hermes/Phoenix (hier)** — kuratiertes Memory + tägliche Notizen
- Grund: bestes Langzeit-Memory, konsistente Stimme über Monate

### Source of Truth für technische Infrastruktur (Wohnmobil, Backups, Hardware)
- **OpenClaw/Rook (auf der VM)** — System-Zustand, Cronjobs, Backup-Logs, Hardware-Inventar
- Grund: dort läuft die Hardware, dort sieht Rook den realen Zustand

### Source of Truth für laufende Alltags-KI-Nutzung
- **Status quo: fragmentiert** — ChatGPT, Claude, Gemini, Perplexity, Hermes
- Kein einzelnes Tool ist "die Quelle"
- Wissen aus diesen Tools wird **bewusst nicht** zentralisiert
- Was hier in `private/` steht, ist das, was Marcus nicht jedes Mal neu erzählen will

## Was nicht hier steht, ist bewusst nicht zentralisiert

Diese Zeile ist keine Ausrede, sondern eine Erinnerung:
- Nicht jedes Gespräch mit jeder KI muss in `private/` landen
- Nicht jedes Tool muss alles wissen
- Fragmentierung ist manchmal die richtige Antwort auf Datensouveränität
- Was zentralisiert wird, entscheidet Marcus — nicht die Tools

## Was in `private/` liegt

- `marcus-resilience-todo.md` — Master-Dokument für Resilienz-Architektur + ToDos (existiert)
- `marcus-source-of-truth.md` — diese Datei (existiert ab 2026-06-12)
- _weiterer Inhalt wird hier ergänzt, sobald Marcus ihn reinstellt_

## Zugangsregel

- Nur Marcus, Phoenix, Rook dürfen lesen und schreiben
- Andere Personas/Instanzen: draußen bleiben
- Phoenix und Rook schreiben nicht ohne Marcus' Erlaubnis
- Wenn Phoenix oder Rook etwas Wichtiges beitragen will, schlägt es vor — Marcus fügt es ein

## Nächstes Review

Dezember 2026 — oder früher, wenn sich an der Alltags-Nutzung oder der Persona-Verteilung was Grundsätzliches ändert.
