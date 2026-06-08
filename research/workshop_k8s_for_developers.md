# Workshop-Outline: "Kubernetes für Entwickler – Von 0 zu Production in 1 Tag"

> Zielgruppe: Entwickler & Tech-Teams, die K8s produktiv nutzen wollen
> Dauer: 8 Stunden (1 Tag, 09:00–17:00 mit Pausen)
> Level: Einsteiger bis Mittelstufe
> Preis: €1.200–€1.500 (bei 6–10 Teilnehmern)
> Erstellt: 2026-06-07

---

## Lernziele

Am Ende des Tages können die Teilnehmer:
- Einen lokalen K8s-Cluster mit kind aufsetzen
- Container-Images bauen und in einem Registry veröffentlichen
- Deployments, Services und ConfigMaps erstellen
- Einen CI/CD-Workflow mit GitLab CI in K8s deployen
- Grundlegende Debugging-Techniken anwenden (Logs, Exec, Port-Forward)
- Die Architektur einer produktionsreifen K8s-Umgebung skizzieren

---

## Voraussetzungen der Teilnehmer

- Docker-Grundlagen (Images, Container, Dockerfile)
- Grundverständnis von YAML
- Laptop mit Admin-Rechten
- Vorab-Installation: Docker Desktop, kubectl, kind, git

---

## Agenda

### 09:00–09:30 | Begrüßung & Einstieg (30 Min)
- Vorstellungsrunde: Wer bist du, was ist dein Hintergrund?
- Warum K8s? – Motivation und Real-World-Beispiele
- Agenda und Lernziele für den Tag
- **Icebreaker:** "Was ist das Schlimmste, das dir in Produktion passiert ist?"

### 09:30–10:30 | Modul 1: K8s-Architektur verstehen (60 Min)
- Die Problemstellung: Von Monolithen zu Microservices
- K8s-Architektur im Überblick: Master-Node, API Server, etcd, Scheduler
- Kernkonzepte: Pods, Deployments, Services, Namespaces
- **Demo:** `kubectl get nodes`, Cluster-Status checken
- **Hands-on:** Erstes Pod erstellen und löschen

### 10:30–10:45 | Kaffeepause

### 10:45–12:15 | Modul 2: Container deployen (90 Min)
- Von Docker zu K8s: Images, Registry, Pull-Secrets
- Deployments: ReplicaSets, Rolling Updates, Rollbacks
- Services: ClusterIP, NodePort, LoadBalancer
- ConfigMaps & Secrets: Konfiguration trennen
- **Hands-on:** Eine simple Web-App deployen
  - Dockerfile bauen
  - Image in Registry pushen
  - Deployment + Service YAML schreiben
  - App im Browser aufrufen

### 12:15–13:15 | Mittagspause

### 13:15–14:45 | Modul 3: Storage, Netzwerk & Ingress (90 Min)
- Persistent Volumes & Claims: Stateful vs. Stateless
- Ingress Controller: Externer Traffic ins Cluster
- TLS/HTTPS mit cert-manager
- **Hands-on:**
  - Eine Datenbank (PostgreSQL) deployen
  - Ingress einrichten
  - HTTPS für die App aktivieren

### 14:45–15:00 | Kaffeepause

### 15:00–16:30 | Modul 4: GitOps & CI/CD (90 Min)
- Warum GitOps? – Infrastructure as Code
- GitLab CI/CD Pipeline für K8s
- Helm: Paketmanagement für K8s
- **Hands-on:**
  - Eine `.gitlab-ci.yml` für K8s-Deployment schreiben
  - Pipeline laufen lassen
  - Änderung pushen → automatisches Deployment

### 16:30–17:00 | Modul 5: Debugging & Best Practices (30 Min)
- `kubectl logs`, `kubectl exec`, `kubectl port-forward`
- Resource Limits & Requests
- Health Checks: Liveness & Readiness Probes
- Monitoring-Stack: Prometheus + Grafana (Überblick)
- **Q&A:** Offene Fragen, Troubleshooting-Szenarien

### 17:00–17:15 | Abschluss & Next Steps (15 Min)
- Zusammenfassung der Key Learnings
- Ressourcen für Weiterlernen
- Kontakt für Follow-up-Fragen
- Feedback-Bogen

---

## Materialien für Teilnehmer

- **Vorab:** Setup-Guide (PDF, 5 Seiten) mit Installationsschritten
- **Während:** GitHub-Repo mit allen YAML-Dateien, Beispiel-Code, Lösungen
- **Nachher:** Cheat-Sheet (PDF, 2 Seiten) mit wichtigsten `kubectl`-Befehlen
- **Bonus:** Liste von 10 empfohlenen K8s-Tools mit Kurzbeschreibung

---

## Technische Voraussetzungen (Workshop-Leiter)

- **Lokaler Cluster:** kind oder minikube auf dem eigenen Laptop
- **Demo-App:** Einfache Node.js/Python-App (Hello World + API-Endpoint)
- **GitLab-Account:** Für CI/CD-Demo (oder GitHub Actions als Alternative)
- **Domain:** Für Ingress/HTTPS-Demo (optional, kann auch lokal mit nip.io)
- **Backup-Plan:** Falls Internet ausfällt – alle Images lokal vorhanden

---

## Varianten & Anpassungen

| Variante | Anpassung | Preis |
|----------|-----------|-------|
| **Remote** | Zoom + Screenshare, Breakout-Räume | €1.000 |
| **Inhouse** | Bei Kunden vor Ort, angepasst auf deren Stack | €1.500 |
| **2-Tage** | Vertieft: Monitoring, Security, Multi-Cluster | €2.500 |
| **Spezialisiert** | Nur GitOps, nur CI/CD, nur Security | €1.200 |

---

## Marketing-Snippets

### LinkedIn-Post
> 🚀 Neuer Workshop: "Kubernetes für Entwickler – Von 0 zu Production in 1 Tag"
> 
> Du bist Entwickler und willst endlich verstehen, wie K8s wirklich funktioniert? 
> Kein Buzzword-Bingo, keine 500-Seiten-Doku. Ein Tag, hands-on, mit echten Beispielen.
> 
> Was du lernst:
> ✅ K8s-Cluster lokal aufsetzen
> ✅ Container bauen & deployen
> ✅ CI/CD-Pipeline mit GitLab
> ✅ Debugging wie ein Pro
> 
> Nächster Termin: [Datum]
> Ort: [Remote / Berlin / dein Büro]
> 
> Interesse? DM oder Email an [deine Email]
> 
> #kubernetes #devops #workshop #cloudnative

### Email-Angebot (an potentielle Kunden)
> Betreff: K8s-Workshop für [Firma] – 1 Tag, hands-on
> 
> Hallo [Name],
> 
> ich biete einen praxisnahen K8s-Workshop für Entwickler-Teams an. 
> 
> **Inhalt:** Von der ersten Container-App bis zum produktionsreifen Deployment mit CI/CD.
> **Format:** 1 Tag, 6–10 Teilnehmer, Remote oder vor Ort.
> **Preis:** €1.200 (Remote) / €1.500 (Inhouse)
> 
> Ich habe [X] Jahre Erfahrung mit K8s in Enterprise-Umgebungen 
> und arbeite aktuell als Senior Consultant bei HiSolutions.
> 
> Interesse an einem kurzen Call?
> 
> Grüße, Marcus

---

## Nächste Schritte (deine To-Do-Liste)

1. **Diese Outline finalisieren** – Anpassen auf deinen Stil
2. **GitHub-Repo erstellen** – Demo-App, YAML-Dateien, Setup-Guide
3. **Pilot-Workshop anbieten** – 1–2 kostenlos für Referenzen
4. **LinkedIn-Post schreiben** – Ankündigung, Interesse sondieren
5. **Termin finden** – Erster Workshop in 4–6 Wochen

---

*Erstellt von Rook Agent | 2026-06-07*
