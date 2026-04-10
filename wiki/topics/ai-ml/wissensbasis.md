# AI & ML — Künstliche Intelligenz & Machine Learning

## Überblick

KI-Prompting, AI-Integration, EU AI Act, AI Agents, ChatGPT.

## Prompt Engineering — Die 26 Prinzipien (Überblick)

1. Keine Höflichkeitsfloskeln (kostet nur Token)
2. Zielgruppe definieren
3. Komplexe Aufgaben aufteilen
4. Affirmative Direktiven ("Tu X" statt "Tu nicht Y")
5. Einfache Erklärungen ("wie bei einem 11-Jährigen")
6. Few-shot Prompting
7. Klare Struktur (###Instruction###)
8. Chain-of-thought ("think step by step")
9. Rolle zuweisen

### Bewertung (1=beste 6=schlechteste)

| Prinzip | Score |
|---------|-------|
| Few-shot | 1 |
| Chain-of-thought | 1 |
| Rolle zuweisen | 1 |
| CoT + Few-shot kombiniert | 1 |
| Aufteilen | 1 |

## EU AI Act — Der Rechtsrahmen

### Risiko-Kategorien

| Kategorie | Beispiele | Pflichten |
|-----------|-----------|-----------|
| **Verboten** | Social Scoring, manipulative KI | Verboten |
| **Hochrisiko** | Medizinprodukte, kritische Infrastruktur | Strenge Auflagen |
| **eingeschränkte Risiken** | Chatbots, Deepfakes | Transparenzpflicht |
| **minimales Risiko** | Spam-Filter | Keine Auflagen |

### Strafen

| Verstoß | Strafe |
|---------|--------|
| Verbotspraktiken | bis €35 Mio |
| Hochrisiko-Auflagen | bis €15 Mio |
| Falschangaben | bis €7,5 Mio |

## AI Agents — Lern-Roadmap

### Stufe 1: Prompting vertiefen
Chain-of-Thought, Tree of Thoughts, Self-Critique, Few-shot

### Stufe 2: Lokale AI-Umgebung
Ollama, Docker, Open WebUI

### Stufe 3: RAG aufbauen
Vector DB (Chroma, Qdrant) + Embeddings

### Stufe 4: Agents bauen
LangChain, LlamaIndex, AutoGen

### Tools

| Tool | Typ | Use Case |
|------|-----|----------|
| LangChain | Framework | Agent-Development |
| Ollama | Lokale Models | LLaMA, Mistral |
| n8n | No-Code | Workflow Automation |
| Chroma/Qdrant | Vector DB | Embeddings speichern |

## ChatGPT Parameter

| Parameter | Bedeutung | Typisch |
|-----------|----------|---------|
| Temperature | Kreativität/Zufälligkeit | 0.7 (kreativ) - 0.1 (präzise) |
| Max Tokens | Maximale Antwortlänge | 500-4000 |
| Top P | Wahrscheinlichkeits cutoff | 0.9-1.0 |

## Relevant Conversations

- `Prompting Guidelines Summary.md`
- `EU AI Act Summary.md`
- `AI Agents Learning Roadmap.md`
- `ChatGPT Cheat Sheet.md`
