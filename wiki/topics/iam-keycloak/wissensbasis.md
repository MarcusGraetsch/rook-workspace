# IAM & Keycloak — Identity & Access Management

## Überblick

Keycloak als zentraler Open-Source Identity Provider. SSO mit OAuth 2.0, OpenID Connect (OIDC) und SAML.

## Keycloak Installation

### VM Installation
```bash
# Java 17 installieren
sudo apt install -y openjdk-17-jdk

# Keycloak herunterladen
cd /opt && sudo wget https://github.com/keycloak/keycloak/releases/download/24.0.0/keycloak-24.0.0.tar.gz
sudo tar -xzf keycloak-24.0.0.tar.gz
sudo chown -R keycloak:keycloak /opt/keycloak

# Production Mode mit Datenbank
sudo -u keycloak /opt/keycloak/bin/kc.sh start --db=postgres --db-url=<JDBC_URL> --https-enabled=true
```

### Kubernetes Deployment Checklist
- [ ] Docker-Image vorbereiten (Custom Themes/Plugins)
- [ ] Helm-Chart nutzen
- [ ] Namespace erstellen
- [ ] Kubernetes Secrets für DB-Credentials und TLS-Zertifikate
- [ ] Persistent Volumes für Realm-Daten
- [ ] Service Mesh Integration (Istio) mit mTLS
- [ ] Ingress Controller + TLS-Konfiguration
- [ ] HPA konfigurieren
- [ ] Prometheus/Grafana Monitoring

## Integration Anforderungen

| Information | Beispiel |
|------------|---------|
| Protokoll | OAuth 2.0, OIDC, SAML |
| Grant Types | Authorization Code, Client Credentials |
| Redirect URIs | `https://myapp.com/callback` |
| Client-Typ | Public, Confidential, Bearer-Only |
| Scopes/Claims | `openid profile email roles` |
| MFA-Anforderungen | TOTP, WebAuthn |

### Client-Typen
- **Public Client**: SPAs ohne Secret
- **Confidential Client**: Backend-Apps mit Secret
- **Bearer-Only**: Reine Backend-Services ohne User-Login

## SAMOA OAuth Erklärung

SAMOA = SAFE mit OAuth — Identitätsmanagement-Framework.

**SAMOA Stack:**
- SSO: OpenID Connect (OIDC)
- Webservice-Security: OAuth Bearer Token + JWT
- Identity Propagation: OAuth Token Exchange (V2+)

**Wichtige Flows:**
1. Authorization Code Flow (für User-Login)
2. Client Credentials Flow (für Service-zu-Service)
3. Token Exchange (für Identity Propagation)

## Sicherheits-Checkliste

- [ ] TLS/SSL für alle Verbindungen
- [ ] Starke Client Secrets
- [ ] Redirect URI Validierung (exact match)
- [ ] PKCE für Public Clients
- [ ] Token-Timing (kurze Access Token Gültigkeit)
- [ ] MFA/2FA für Admin-Zugang
- [ ] Network Policies: Nur erlaubte Verbindungen
- [ ] Keycloak Version aktuell halten

## Relevant Conversations

- `Install Keycloak on VM.md`
- `Keycloak Deployment Checklist.md`
- `Keycloak Integration Anforderungen.md`
- `SAMOA OAuth Erklärung.md`
