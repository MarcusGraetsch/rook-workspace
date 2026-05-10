# rook-k8s-lab

> IDP Platform: Kubernetes, Keycloak, ArgoCD, Flux, Security, Compliance.
> Private repository. Security-critical. Defense in depth.

## Stack
- **Kubernetes:** kind (local), kubectl, helm
- **Security:** Keycloak, OPA Gatekeeper, Trivy, kube-bench, Polaris
- **GitOps:** Flux, ArgoCD
- **IaC:** Ansible, Terraform (optional)
- **Monitoring:** Prometheus, Grafana
- **Secrets:** SOPS + Age, External Secrets Operator
- **Docs:** Markdown mit Compliance-Referenzen (BSI, NIS2, ISO, DSGVO)

## Build/Test
```bash
# Helm-Charts validieren
helm lint charts/*

# Kubernetes-Manifests validieren
kubeconform -strict manifests/

# Ansible-Syntax
cd ansible && ansible-playbook --syntax-check site.yml

# Conftest (OPA-Regeln)
conftest test manifests/ --policy policies/
```

## Konventionen
- **YAML:** Keine hardcoded Werte, Nutze `values.yaml` + Templates
- **Shell:** Extrem defensiv, Input-Validierung, kein `eval`, kein `curl | bash`
- **Security:** Prinzip der minimalen Rechte (least privilege), Zero Trust
- **Docs:** Jede Änderung in Compliance-Docs nachführen
- **Naming:** `kebab-case` für Ressourcen, `PascalCase` für CRDs

## Folder Structure
```
docs/                    # Dokumentation mit Compliance-Referenzen
manifests/               # Kubernetes-Manifests (roh oder templated)
charts/                  # Helm-Charts
ansible/                 # Ansible-Playbooks
policies/                # OPA/Rego-Policies
scripts/                 # Hilfs-Scripts
```

## Off-Limits (NIEMALS ändern ohne Security-Review)
- `manifests/security/` — Netzwerk-Policies, RBAC, PodSecurity
- `scripts/` die Secrets oder Credentials handhaben
- Alle Production-Config (außer explizit als `*-example.yaml` markiert)
- Compliance-Docs (BSI C5, NIS2, ISO) — Nur mit Marcus-Approval

## Beispiel-Datei (YAML-Stil)
Siehe: `manifests/security/network-policies.yaml`

## Testing
- `helm lint` für alle Charts
- `kubeconform` für alle Manifests
- `conftest` für OPA-Regeln
- `trivy` für Container-Scanning
- Integration-Tests via `kind`

## Security (ABSOLUT KRITISCH)
- **Secrets:** SOPS + Age, keine Klartext-Seeds
- **Auth:** Keycloak-Config nur via GitOps (Flux), nie manuell im Cluster
- **Netzwerk:** NetworkPolicies default-deny, explizite Allow-Regeln
- **Scanning:** Trivy vor jedem Deployment, kube-bench monatlich
- **Audit:** Jede Änderung loggen, Rollback-Plan parat

## Deployment
- **Local (kind):** `make deploy-local` oder `skaffold dev`
- **Staging:** GitOps via Flux, automatisch bei Push
- **Production:** Manueller Approval, Blue-Green Deployment

## Compliance
- BSI C5: Cloud Computing Compliance
- NIS2: Incident Reporting 24h/72h
- ISO 27001: Information Security Management
- DSGVO: Auftragsverarbeitung dokumentieren
