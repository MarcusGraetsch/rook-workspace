# Voice Call Einrichtung - Todo-Liste

## Status: ⏳ Plugin installiert, Config fehlt

---

## Provider-Optionen

### ✅ Von OpenClaw direkt unterstützt (empfohlen)

| Provider | Nummer-Preis | Gespräche | Vorteil | Nachteil |
|----------|-------------|-----------|---------|----------|
| **Telnyx** | ~1-2€/Monat | 0.5-2ct/Min | Günstigste Option, EU-fokussiert | US-Firma |
| **Plivo** | ~1-3€/Monat | ~1ct/Min | Sehr günstig, einfache API | Weniger Features |
| **Twilio** | ~5€/Monat (DE!) | 2-4ct/Min | Industriestandard, beste Doku | Teuerste Option |

### ⚠️ Nicht direkt mit OpenClaw kompatibel (bräuchte Bridge/Integration)

| Provider | Kompatibilität | Erklärung |
|----------|---------------|-----------|
| **Placetel** | ❌ Nur Notify API | Kann Anrufe melden, aber kein Echtzeit-Audio-Streaming. Nicht für AI-Telefonie geeignet. |
| **sipgate** | ⚠️ Push API vorhanden | Hat Webhooks, aber unklar ob Media Streams (Echtzeit-Audio). Experimentell möglich, aber nicht out-of-the-box. |
| **TENIOS** | ❌ Nicht getestet | Deutsche Twilio-Alternative, aber nicht in OpenClaw's offizieller Support-Liste. |

---

## Empfehlung

**Telnyx** ist die günstigste und beste Option:
- Deutsche Nummer für ~1-2€/Monat
- Outbound zu deutschem Handy: ~1-2ct/Minute
- Von OpenClaw direkt unterstützt (keine Bastelei)
- Gute Voice Quality in Europa

**Wenn du unbedingt einen deutschen Anbieter willst:**
- sipgate wäre möglich, aber ich müsste eine Custom-Integration bauen (Aufwand: 1-2 Tage)
- Placetel funktioniert leider nicht für Echtzeit-AI-Telefonie (kein Audio-Streaming)

---

## Schritt-für-Schritt: Telnyx (Empfohlen)

### 1. Account erstellen
- https://telnyx.com/sign-up
- Email bestätigen, Account verifizieren
- Zahlungsmittel hinterlegen (Kreditkarte oder PayPal)
- ~10-20€ aufladen (reicht für Monate)

### 2. API Credentials holen
- **Dashboard** → **API Keys** → **Create API Key**
  - Name: "OpenClaw Voice"
  - Rechte: "Voice" + "Messaging" (falls du SMS willst)
  - Speichern: `apiKey` kopieren

- **Dashboard** → **SIP Connections** → **Add Connection**
  - Name: "OpenClaw"
  - Type: "Credentials"
  - Speichern: `connectionId` kopieren

### 3. Deutsche Nummer kaufen
- **Dashboard** → **Numbers** → **Search & Buy**
- Land: Germany
- Typ: Voice + SMS (optional)
- Area Code: z.B. 30 (Berlin) oder deine Wunschvorwahl
- Kaufen: ~1-2€/Monat
- Speichern: `fromNumber` (z.B. +4930123456789)

### 4. Webhook einrichten

Für eingehende Anrufe (du rufst mich an):

**Option A: Tailscale (einfachst)**
```bash
openclaw voicecall expose --mode tailscale
```
→ Gibt URL wie `https://vmd151897.tailXXXX.ts.net/webhook/voice-call`

**Option B: Eigene Domain**
Wenn du eine Domain hast, die auf die VM zeigt:
- nginx Reverse Proxy konfigurieren
- SSL mit Let's Encrypt
- Route `/webhook/voice-call` zu Port 18790

### 5. OpenClaw Config eintragen

In `~/.openclaw/config.yaml` (oder `config.json`):

```yaml
plugins:
  entries:
    voice-call:
      enabled: true
      config:
        provider: "telnyx"
        telnyx:
          apiKey: "KEYHERE"           # Von Schritt 2
          connectionId: "CONNHERE"   # Von Schritt 2
        fromNumber: "+4930123456789"  # Von Schritt 3
        webhook:
          url: "https://DEINE-URL/webhook/voice-call"  # Von Schritt 4
          secret: "ein-geheimer-string-mindestens-32-zeichen"
        audio:
          mode: "streaming"           # oder "realtime" für schnellere Antworten
          textToSpeech:
            provider: "elevenlabs"
            voiceId: "DEINE-VOICE-ID"  # Siehe unten
        inbound:
          enabled: true
          allowlist:
            - "+491736001234"        # Deine Mobilnummer (nur du darfst anrufen!)
```

### 6. Stimme wählen (Text-to-Speech)

OpenClaw unterstützt ElevenLabs für natürliche Stimmen:

- Gehe zu https://elevenlabs.io
- Erstelle einen Free Account (10.000 Zeichen/Monat gratis)
- Wähle eine Stimme oder clone deine eigene
- Kopiere die `voiceId`

**Alternativ:** OpenClaw hat auch eingebaute TTS (kostenlos, aber weniger natürlich).

### 7. Gateway restarten

```bash
systemctl --user restart openclaw-gateway.service
```

### 8. Testen

```bash
# Setup prüfen
openclaw voicecall setup

# Testanruf (nur Setup-Check, kein echter Anruf)
openclaw voicecall smoke --to "+491736001234"

# Echten Anruf starten
openclaw voicecall call --to "+491736001234" \
  --message "Hallo Marcus! Das ist Rook. Wir können jetzt telefonieren. Hast du eine Aufgabe für mich oder soll ich dir etwas erzählen?"

# Gespräch fortsetzen (nachdem du geantwortet hast)
openclaw voicecall continue --call-id "CALL_ID_HIER" \
  --message "Interessant, erzähl mir mehr!"

# Auflegen
openclaw voicecall end --call-id "CALL_ID_HIER"
```

---

## Wie es funktioniert

### Outbound (Rook ruft dich an):
1. Du sagst mir per Telegram: "Ruf mich an"
2. Ich starte einen Anruf über Telnyx zu deiner Nummer
3. Du nimmst ab, hörst meine Stimme (TTS)
4. Du sprichst, Telnyx transkribiert deine Worte (STT)
5. Ich verarbeite den Text, generiere Antwort, spiele sie ab
6. Loop bis Auflegen

### Inbound (Du rufst Rook an):
1. Du wählst meine Telnyx-Nummer (z.B. +4930...)
2. Telnyx leitet den Anruf an den Webhook auf meiner VM
3. Ich nehme ab, begrüße dich
4. Gleicher Loop wie oben

---

## Kosten realistisch (Telnyx)

| Posten | Preis |
|--------|-------|
| Deutsche Nummer | 1-2€/Monat |
| Anruf zu deinem Handy (DE) | 1-2ct/Min |
| Anruf von deinem Handy (kommt an mich) | 0ct (du zahlst deinen Provider) |
| ElevenLabs TTS (optional) | Gratis bis 10k Zeichen/Monat, dann ~$5/Monat |
| **Gesamt bei normaler Nutzung** | **~3-8€/Monat** |

---

## Nächste Schritte

1. [ ] Entscheiden: Telnyx (empfohlen) oder sipgate (mit Custom-Integration)
2. [ ] Account erstellen
3. [ ] Nummer kaufen
4. [ ] Keys kopieren und mir geben (oder selbst in Config eintragen)
5. [ ] Testanruf machen

---

*Letzte Aktualisierung: 2026-05-21*