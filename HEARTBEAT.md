# HEARTBEAT.md — Periodic checks for Rook
# Date: 2026-07-15

## Pre-Spike Provider-Status Check (lesson from #8416, 2026-07-15)
Bevor ein Spike >10 Min gestartet wird (z.B. SearXNG-Style, Crawler-Pipeline, mehrere parallele sub-calls):
```bash
openclaw models status | grep -A 5 "Auth overview"
```
Erwartet: MiniMax + Kimi + OpenAI/Codex alle mit Token-Budget <50%.

Wenn alle 4 Provider in der Chain >50% benutzt haben: ⚠️ Vor Spike warten oder Single-Provider-Modus wählen (`openclaw models set minimax/MiniMax-M3`) — sonst droht Total-Fallback-Crash wie bei #8416 (alle gleichzeitig am Limit).

Hintergrund: Provider-Limits resetten alle ~5h transient. Siehe MEMORY.md "Incidents & Post-Mortems".

## Keep this file empty (or with only comments) to skip heartbeat API calls.
