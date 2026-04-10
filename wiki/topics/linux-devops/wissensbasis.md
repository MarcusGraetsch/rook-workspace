# Linux & DevOps — Praxiswissen

## Überblick

Linux-Administration, SSH, WSL, Bash/PowerShell-Scripts.

## SSH Setup & Troubleshooting

```bash
# Key erstellen
ssh-keygen -t ed25519 -C "beschreibung"

# Key auf Server kopieren
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server

# REMOTE HOST IDENTIFIED HAS CHANGED — Fix:
ssh-keygen -R hostname
```

**Permission Error — Rechte:**
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

## WSL (Windows Subsystem for Linux)

```powershell
# Installieren
wsl --install -d Ubuntu-22.04

# Update
wsl --update

# Dateitransfer Windows → WSL:
cp /mnt/c/Users/Name/Downloads/file.txt ~/

# Reset
wsl --shutdown
```

## Ubuntu Setup

```bash
# Update & Upgrade
sudo apt update && sudo apt upgrade -y

# Härtung:
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH Server installieren
sudo apt install -y openssh-server
```

## Bash Scripts

```bash
#!/bin/bash
# API Call mit curl
curl -s -X GET "$URL" -H "Authorization: Bearer $TOKEN" | jq .

# File Processing
for file in *.txt; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
  fi
done
```

## PowerShell

```powershell
New-Item -ItemType Directory -Path "C:\Temp\MeinVerzeichnis"
Get-Content C:\pfad\datei.txt | Out-File C:\output\output.txt
scp C:\local\file.txt user@server:/remote/path/
```

## Relevant Conversations

- `SSH Connection Error Analysis.md`
- `WSL Dev Setup Guide.md`
- `Ubuntu setup script.md`
