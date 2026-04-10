# API & Middleware — Praxiswissen

## Überblick

API-Gateways, REST/SOAP Integration, Gravitee.

## API-Gateway Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| Routing | Requests an Backend-Services weiterleiten |
| Auth | API-Keys, OAuth, JWT Validierung |
| Rate Limiting | Requests pro Zeit limitieren |
| Caching | Responses zwischenspeichern |

## REST API Design

```yaml
openapi: 3.0.3
info:
  title: Mein API
  version: 1.0.0
paths:
  /customers:
    get:
      responses:
        '200':
          description: OK
```

## REST → SOAP Integration

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <ns1:GetCustomer xmlns:ns1="http://example.com/customer">
         <customerId>12345</customerId>
      </ns1:GetCustomer>
   </soapenv:Body>
</soapenv:Envelope>
```

## API Call Beispiel (Wetter)

```python
import requests

response = requests.get(
    "https://api.open-meteo.com/v1/forecast",
    params={"latitude": 52.52, "longitude": 13.41, "current_weather": True}
)
print(response.json()["current_weather"])
```

## Gravitee

Features: API-Lebenszyklus-Management, Developer Portal, Analytics, Policy Engine.

## Relevant Conversations

- `API-Gateway- Funktionalität und Implementierung.md`
- `API Call- Wetterdaten Fetch.md`
