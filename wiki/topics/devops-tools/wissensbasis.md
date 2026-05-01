# DevOps Tools — Überblick

## Überblick

Sammlung von DevOps-Tools und Konzepten. Diese Page ist ein Überblick — für Details in die spezifischen Topics gehen.

## Container

**Docker:**
```bash
docker run -d --name=grafana -p 3000:3000 grafana/grafana
docker logs <container> 2>&1 | grep error
docker exec -it <container> /bin/sh
```

**Kubernetes:** Siehe → [[cloud-kubernetes]]

## CI/CD

**GitLab CI/CD:**
```yaml
build:
  script:
    - docker build -t myapp:$CI_COMMIT_SHA .
    - docker push myapp:$CI_COMMIT_SHA
```

Siehe → [[gitops-cicd]] für vollständige Pipeline-Beispiele.

## Infrastructure as Code

**Ansible, Terraform:**
- Ansible für Konfigurationsmanagement
- Terraform für Cloud-Ressourcen
- Siehe → [[linux-devops]] für praktische Beispiele

## Monitoring

**Prometheus + Grafana:**
- Metrics sammeln, visualisieren
- Siehe → [[monitoring-observability]]

## Cross-References

- → [[cloud-kubernetes]] — Container-Orchestrierung
- → [[gitops-cicd]] — GitOps Workflows
- → [[linux-devops]] — Shell, SSH, Automation
- → [[monitoring-observability]] — Observability Stack

## Relevant Conversations

- DevOps-related conversations in workspace

---
*Zuletzt aktualisiert: 2026-05-01*
