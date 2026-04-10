# ADOIT — Enterprise Architecture Tool

## Überblick

ADOIT ist ein EA-Tool von BOC Group. IT-Landschaften dokumentieren, Abhängigkeiten analysieren.

## Architektur (3-VM Produktion)

| VM | Rolle | Spezifikationen |
|----|-------|----------------|
| VM 1 | Webserver (IIS/Tomcat) | 2 vCPU, 8 GB RAM, 50 GB SSD |
| VM 2 | Applikationserver | 4 vCPU, 16 GB RAM, 100 GB SSD |
| VM 3 | Datenbankserver | 4-8 vCPU, 16-32 GB RAM, 200 GB SSD |

## REST API

### Basis-URL Format
```
http://<HOST>:<PORT>/ADOIT/rest/2.0/repos/<REPO_ID>/objects/<ARTIFACT_ID>
```

### Authentifizierung
Basic Auth: `Authorization: Basic <base64(username:password)>`

### Attribute aus URL extrahieren
```
https://adoit.my.url.de?repoid=b0a8a11c-0c2f-465c-9bb8-900cb9c81123&id=f58ca273-7616-4af6-9af1-2b95ab6bcfe4
```
- `repoid` = Repository ID
- `id` = Artifact ID

## Geplante Projekte

### ADOITSync
Python-basiertes Tool um CSV/SAM-Daten nach ADOIT zu syncen.

## Relevant Conversations

- `ADOIT Setup IONOS Cloud.md`
- `Python ADOIT Integration Plan.md`
