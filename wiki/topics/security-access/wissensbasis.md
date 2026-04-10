# Security & Access — Praxiswissen

## Überblick

SSL/TLS Zertifikate, Cloud Security, Kubernetes Security, Vault.

## SSL/TLS Zertifikate

```bash
# Zertifikat anzeigen
openssl s_client -connect example.com:443 -showcerts

# Ablaufdatum prüfen
openssl x509 -in cert.pem -noout -dates

# Certificate Chain prüfen
openssl s_client -connect example.com:443 -showcerts | grep "Verify return code"
```

### Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
sudo certbot renew --dry-run
```

## Cloud Security

### Shared Responsibility Model

| Verantwortung | Provider | Kunde |
|--------------|----------|-------|
| Physical Security | Provider | - |
| OS Patches (managed) | Provider | Customer |
| Data | - | Customer |
| Access Management | - | Customer |

### Compliance Frameworks

| Framework | Fokus |
|-----------|-------|
| BSI C5 | Cloud Computing (DE) |
| ISO 27001 | Information Security |
| NIS2 | Netzwerk/IT-Sicherheit (EU) |

## Kubernetes Security

### Istio mTLS

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

## HashiCorp Vault

```bash
# Secret schreiben
vault kv put secret/myapp/database host="db.example.com" port="5432"

# Secret lesen
vault kv get secret/myapp/database
```

## Relevant Conversations

- `SSL Certificate Issue Troubleshooting.md`
- `Cluster Security with Istio.md`
- `Cloud Security Basics..md`
