# Cloud & Kubernetes — Wissensbasis

## Überblick

Kubernetes ist das zentrale Orchestrierungs-Tool für Container. Cloud-Native Architektur bildet das Fundament moderner IT-Infrastruktur.

## Kubernetes 101

### Core Objects

```bash
kubectl get pods -A
kubectl get deployments -A
kubectl rollout status deployment/<name> -n <namespace>
kubectl rollout undo deployment/<name> -n <namespace>
kubectl logs -n <namespace> <pod> --tail=100
kubectl exec -it <pod> -n <namespace> -- /bin/bash
kubectl describe pod <name> -n <namespace>
```

### Init Containers vs Sidecars

**Init Container** — läuft VOR dem Haupt-Container:
```yaml
initContainers:
  - name: init-db
    image: postgres-client
    command: ['sh', '-c', 'until nc -z db:5432; do sleep 2; done']
```

**Sidecar** — läuft parallel zum Haupt-Container:
```yaml
containers:
  - name: main-app
  - name: logging-sidecar
    command: ['sh', '-c', 'tail -f /var/log/app.log']
```

## GitOps mit ArgoCD

### Workflow
```
Code Commit → GitLab CI → Build Image → Push to Registry
ArgoCD erkennt Änderung → Sync zum Cluster
```

### Application CR
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://git.example.com/manifests.git
    targetRevision: HEAD
    path: overlays/production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Secrets Management

| Tool | Vorteil | Nachteil |
|------|---------|----------|
| HashiCorp Vault | Dynamic Secrets | Komplex |
| Sealed Secrets | GitOps-safe, offline | Keine Dynamic Secrets |
| External Secrets Operator | Cloud-Integration | Braucht externen Store |

### Sealed Secrets Workflow
```bash
kubeseal --fetch-cert > pub-cert.pem
kubeseal --cert=pub-cert.pem --format=yaml < my-secret.yaml > sealed-secret.yaml
```

## Ingress-Nginx
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        backend:
          service:
            name: my-service
            port:
              number: 80
```

## Plattform-Vergleich

| Plattform | Typ | Stärken |
|-----------|-----|---------|
| OpenShift | Enterprise | Operator Ecosystem, Security |
| Tanzu TKGI | Enterprise | VMware-Integration |
| Rancher | Multi-Cluster | Multi-Cloud Management |
| k3s | Lightweight | <512MB RAM, ARM-Support |
| MicroK8s | Lightweight | Schnell, Ubuntu-nah |

## Beratungs-Themen

- Cloud-Richtlinien erstellen
- Kubernetes-Workshops (2-Tages-Format)
- IaC aufsetzen (Ansible + ArgoCD GitOps)
- Architektur-Reviews
- Compliance-Audits (BSI C5, NIS2)
- Cloud Exit Strategie

## Offene Punkte

- [ ] Cloud Exit Strategie finalisieren (Kundenprojekt)
- [ ] GitOps-Pipeline mit ArgoCD für neuen Kunden
- [ ] Passkeys/Passwordless Auth evaluieren
