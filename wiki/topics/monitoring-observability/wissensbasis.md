# Monitoring & Observability — Praxiswissen

## Überblick

Prometheus, Grafana, Logging, Observability.

## Prometheus

### Konfiguration
```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'kubernetes-nodes'
    static_configs:
      - targets: ['node1:9100', 'node2:9100']
```

### Troubleshooting
```bash
kubectl top nodes
kubectl logs -n kube-system -l k8s-app=metrics-server
```

## Grafana

### Docker Installation
```bash
docker run -d --name=grafana -p 3000:3000 -v grafana-data:/var/lib/grafana grafana/grafana
```

### Grafana Alloy (Nachfolger von Telegraf)
```bash
curl -O https://github.com/grafana/alloy/releases/latest/download/alloy-linux-amd64
```

## Logging

### Docker Logging konfigurieren
```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

### Tools

| Tool | Typ |
|------|-----|
| ELK Stack | Zentralisiertes Logging |
| Loki | Logging (Prometheus-Stack) |
| Fluentd | Log Collector |
| Vector | Observability Pipeline |

## Drei Säulen der Observability

1. **Metrics** — Prometheus
2. **Logs** — Loki, ELK
3. **Traces** — Jaeger, Tempo

## Relevant Conversations

- `Prometheus Benutzerkonzept entwickeln.md`
- `Grafana Alloy neben Prometheus.md`
- `Benutzerkonzept Monitoring Logging.md`
