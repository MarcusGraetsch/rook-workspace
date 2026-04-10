# Networking — Praxiswissen

## Überblick

Netzwerk-Grundlagen, DNS, Cloud Networking, Troubleshooting.

## IP & DNS

```bash
# Lokale IP finden (Linux)
hostname -I
ip addr show

# Lokale IP finden (Windows)
ipconfig

# Öffentliche IP
curl ifconfig.me
```

### DNS Record Types

| Type | Beschreibung |
|------|-------------|
| A | IPv4 Adresse |
| CNAME | Alias |
| MX | Mail Exchange |
| TXT | Text/Verification (SPF, DKIM) |

```bash
nslookup example.com
dig example.com
systemd-resolve --flush-caches  # DNS Cache leeren
```

## Cloud Networking (GCP/AWS)

### VPC Design Principles
- **Least Privilege** — Firewall Rules eng wie möglich
- **Defense in Depth** — Mehrere Security Layers
- **Segmentierung** — Separate Subnetze für Tier/Umgebung

## Troubleshooting

```bash
ping <host>
telnet <host> <port>
nc -zv <host> <port>
traceroute <host>    # Linux
tracert <host>       # Windows
netstat -tulpn
ss -tulpn
```

## WLAN (Linux)

```bash
nmcli device wifi list
nmcli device status
nmcli device wifi connect <SSID> password <PASSWORD>
lshw -C network
```

## Relevant Conversations

- `DNS Troubleshooting Guide.md`
- `Cloud Network Design- Basics.md`
