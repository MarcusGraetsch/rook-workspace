# Kimi K2.6 Runtime Registry Repair

Date: 2026-04-23

## Scope

Diagnose und Reparatur der Telegram/OpenClaw-Störung nach der Umstellung auf Kimi K2.6. Betroffen war der Embedded-Agent-Pfad fuer Rook/Telegram und der zentrale Gateway-Model-Resolver.

## Findings

- Telegram/Rook scheiterte mit `Unknown model: kimi/moonshot-k2-6`.
- Die aktive OpenClaw-Konfiguration nutzte `kimi-coding/moonshot-k2-6` als Primaermodell.
- OpenClaw loest diesen Alias im Gateway/CLI auf `kimi/moonshot-k2-6` auf.
- Vor der Reparatur war `moonshot-k2-6` zwar in einzelnen `kimi-coding` Agent-Modelldateien vorhanden, aber nicht sauber in der zentralen Runtime-Registry `openclaw.json` unter `models.providers.kimi.models`.
- Einzelne Agent-Modelldateien koennen durch OpenClaw-Sync/CLI-Läufe regeneriert werden; eine reine Reparatur dieser Dateien ist deshalb nicht stabil genug.

## Actions Taken

- `/root/.openclaw/openclaw.json` live angepasst:
  - `models.providers.kimi.models` um `moonshot-k2-6` ergaenzt.
  - `agents.defaults.models` um `kimi-coding/moonshot-k2-6` und den aufgeloesten Pfad `kimi/moonshot-k2-6` ergaenzt.
- Runtime-Agent-Modelldateien erneut synchronisiert, damit aktive Agenten den aufgeloesten `kimi/moonshot-k2-6` Pfad kennen.
- `openclaw-gateway.service` neu gestartet.
- `operations/bin/check-model-config-drift.mjs` erweitert:
  - kennt jetzt die Alias-Beziehung `kimi-coding <-> kimi`.
  - prueft zusaetzlich die zentrale OpenClaw-Model-Registry fuer Primaermodelle.
  - meldet fehlende Provider/Modelle im zentralen `openclaw.json` als Fehler.
  - meldet fehlende Allowlist-Eintraege fuer Primaermodelle als Warnung.

## Validation

- `openclaw models list --agent main` zeigt `kimi/moonshot-k2-6` als `default,configured` mit Auth vorhanden.
- `systemctl --user status openclaw-gateway.service` zeigt den Gateway aktiv und ready mit `agent model: kimi/moonshot-k2-6`.
- Nach dem letzten Gateway-Neustart wurde keine neue `Unknown model: kimi/moonshot-k2-6` Meldung beobachtet.
- `node operations/bin/check-model-config-drift.mjs` ist gruen und meldet keine Warnungen.
- `node operations/bin/check-runtime-control-plane.mjs` ist gruen; verbleibende Warnungen sind die bereits bekannten Themen `main` als unbound Agent Dir, Dispatcher-Hook-Modell-Drift und bestaetigte Posture-Hinweise.

## Open Risks

- Der lokale `openclaw agent` CLI-Test fiel nach Gateway-Verbindungsabbruch auf den eingebetteten lokalen Runner zurueck und scheiterte dort mit `network connection error`. Das reproduziert nicht mehr den urspruenglichen `Unknown model` Fehler, ist aber kein vollstaendiger Ende-zu-Ende-Telegram-Erfolgstest.
- Gateway-Logs zeigen weiterhin `EMFILE: too many open files, watch '/root/.openclaw/openclaw.json'`. Das ist ein separates Stabilitaetsthema und sollte als naechstes untersucht werden.
- `/root/.openclaw/agents/main` bleibt ein unbound, aber aktiv beruehrter Runtime-Agent-Ordner. Nicht archivieren, solange Gateway/CLI ihn noch regeneriert oder nutzt.

## Next Steps

- Einen echten Telegram-DM-Test nach der Reparatur ausloesen und die Gateway-Logs unmittelbar danach auf `Unknown model`, Auth-Fehler oder Provider-Network-Fehler pruefen.
- `EMFILE` Ursachen analysieren: File-Descriptor-Limits, Watcher-Anzahl und OpenClaw-Reload-Verhalten.
- Die Update-/Config-Doku um die Regel ergaenzen, dass Provider-Aliase sowohl in `agents.defaults.model.primary`, `agents.defaults.models` als auch in `models.providers` konsistent sein muessen.
