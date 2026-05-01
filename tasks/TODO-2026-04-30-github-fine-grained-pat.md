# TODO: GitHub Fine-Grained PAT für Flux einrichten

**Erstellt:** 2026-04-30
**Status:** Offen

## Was
GitHub Fine-Grained PAT erstellen, das nur Leserechte auf `rook-k8s-lab` hat — statt dem aktuellen Broad Token.

## Warum
- Aktueller Token geht für **alle** Repos → Sicherheitsrisiko
- Fine-Grained = nur spezifisches Repo, weniger Rechte
- Flux GitAuth Secret muss dann mit neuem Token erstellt werden

## Wann
Bald — bisher läuft das IDP noch mit public Repo, aber bei private Repos wird es nötig

## How-To
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Neuer Token:
   - **Name:** `flux-rook-k8s-lab`
   - **Resource owner:** MarcusGraetsch
   - **Repository access:** Nur `rook-k8s-lab` auswählen
   - **Permissions:** Contents: Read-only (reicht für Flux)
3. Token kopieren → in Flux Secret schreiben

## Referenzen
- Flux GitAuth Secret: `flux-git-auth` in `flux-system` Namespace
- GitLab Deploy Token als Alternative (siehe MEMORY.md)
