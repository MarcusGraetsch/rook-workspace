---
name: compare-models
description: "Vergleiche zwei Modell-Antworten auf dieselbe Frage. Nutzung: /compare \"frage\" [modell1] [modell2]"
user-invocable: true
---

# compare-models

Vergleicht zwei Modelle auf dieselbe Frage.

## Nutzung

```
/compare "frage"
/compare "frage" modell1 modell2
```

## Modelle

| Alias | Vollständiger Name | Provider |
|-------|-------------------|----------|
| M3 | minimax/MiniMax-M3 | MiniMax (1M context) |
| Minimax | minimax/MiniMax-M2.7 | MiniMax |
| Kimi | kimi/moonshot-k2-6 | Kimi |
| Codex | openai/gpt-5.4 | OpenAI |
| DeepSeek | openrouter/deepseek-chat-v3 | OpenRouter |
| Qwen | openrouter/qwen-2.5-72b-instruct | OpenRouter |
| Gemini | openrouter/google-gemini-2.5-flash | OpenRouter |
| Mistral | openrouter/mistralai/mistral-nemo | OpenRouter |

## Beispiele

```
/compare Was ist Docker?
/compare Was ist Kubernetes? DeepSeek Qwen
/compare Erkläre Git in einem Satz Kimi Codex
/compare TLS erklärt Gemini M3
```

## Script

`scripts/compare.sh` — ruft beide Modelle per OpenAI-kompatibler API auf.

## Timeout

45 Sekunden pro Modell.
