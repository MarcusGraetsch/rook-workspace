# PostgreSQL — Praxiswissen

## Überblick

PostgreSQL Installation, Konfiguration, Troubleshooting, pgAdmin.

## Installation

```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql
```

## SQL Grundlagen

```sql
CREATE DATABASE meinprojekt;
CREATE USER meinuser WITH ENCRYPTED PASSWORD 'geheim';
GRANT ALL PRIVILEGES ON DATABASE meinprojekt TO meinuser;

CREATE TABLE mitarbeiter (
    id SERIAL PRIMARY KEY,
    vorname VARCHAR(100),
    nachname VARCHAR(100),
    gehalt DECIMAL(10,2)
);

INSERT INTO mitarbeiter (vorname, nachname, gehalt) VALUES ('Max', 'Mustermann', 55000.00);
SELECT * FROM mitarbeiter WHERE abteilung = 'IT';
```

## pgAdmin

```bash
sudo /usr/pgadmin4/bin/setup-web.sh

-- Monitoring Query:
SELECT * FROM pg_stat_activity;
SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;
```

## Troubleshooting

**Connection Timeout:**
1. Prüfen ob PostgreSQL läuft: `sudo systemctl status postgresql`
2. Firewall: Port 5432 freigeben
3. pg_hba.conf: `host all all 0.0.0.0/0 md5`
4. postgresql.conf: `listen_addresses = '*'`

```bash
# Config-Änderung:
sudo nano /etc/postgresql/15/main/postgresql.conf
sudo systemctl reload postgresql
```

## MySQL vs PostgreSQL

| Feature | MySQL | PostgreSQL |
|---------|-------|-----------|
| JSON Support | Eingeschränkt | Vollständig |
| Array Types | Nein | Ja |
| Full Text Search | Ja | Ja (performanter) |

## Relevant Conversations

- `PostgreSQL Config Debugging.md`
- `Database Connection Timeout Error.md`
- `Arbeiten mit PostgreSQL Datenbanken.md`
