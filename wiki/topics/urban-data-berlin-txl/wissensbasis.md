# Urban Data & Berlin TXL — FUTR HUB Projekt

## Überblick

Berlin TXL FUTR HUB — urbane Datenplattform für das ehemalige Tegeler Flughafen-Gelände. Geodaten-Infrastruktur, CKAN, GeoServer, INSPIRE-Compliance.

## Technologie-Stack

| Komponente | Technologien |
|-----------|-------------|
| Datenportal | CKAN |
| GIS-Server | GeoServer |
| Frontend | MasterPortal |
| Datenformat | COG (Cloud Optimized GeoTIFF) |
| Metadaten | INSPIRE, RDF DCAT |
| OGC-Services | WMS, WMTS, WFS, WCS |

## GeoServer

| Service | Beschreibung | Use Case |
|---------|-------------|---------|
| WMS | Web Map Service | Karten an Clients |
| WMTS | Web Map Tile Service | Vorgefertigte Kacheln |
| WFS | Web Feature Service | Vektor-Daten |
| WCS | Web Coverage Service | Raster-Daten |

## INSPIRE

EU-Richtlinie (2007/2/EC) für einheitliche Geodaten-Infrastruktur in Europa. 34 räumliche Datenthemen, Metadaten-Standard (ISO 19115).

## COG Erstellung

```bash
gdal_translate -of COG input.tif output_cog.tif
```

## Relevant Conversations

- `GeoServer Setup and Services.md`
- `CKAN to Geoserver Migration..md`
- `INSPIRE standard explained..md`
