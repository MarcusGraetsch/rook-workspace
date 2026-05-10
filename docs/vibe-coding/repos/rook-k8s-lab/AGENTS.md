# rook-k8s-lab

> IDP Platform: Kubernetes, Keycloak, ArgoCD, Flux, Security, Compliance.
> Private repository. Security-critical. Defense in depth.

## Stack
- Kubernetes: kind (local), kubectl, helm
- Security: Keycloak, OPA Gatekeeper, Trivy, kube-bench, Polaris
- GitOps: Flux, ArgoCD
- IaC: Ansible
- Monitoring: Prometheus, Grafana
- Secrets: SOPS + Age

## Build/Test
```bash
helm lint charts/*
kubeconform -strict manifests/
conftest test manifests/ --policy policies/
```

## Konventionen
- YAML: Keine hardcoded Werte, values.yaml + Templates
- Shell: Extrem defensiv, Input-Validierung, kein eval
- Security: Least privilege, Zero Trust
- Docs: Jede Änderung in Compliance-Docs nachführen

## Off-Limits
- manifests/security/ — Nur mit Security-Review
- Scripts mit Secrets/Credentials
- Production-Config
- Compliance-Docs (BSI, NIS2, ISO)

## Beispiel-Datei
manifests/security/network-policies.yaml

## Security
- Secrets: SOPS + Age, keine Klartext-Seeds
- Auth: Keycloak via GitOps (Flux)
- Netzwerk: Default-deny NetworkPolicies
- Scanning: Trivy vor Deployment
- Audit: Änderungen loggen, Rollback parat

## Compliance
- BSI C5, NIS2, ISO 27001, DSGVO
