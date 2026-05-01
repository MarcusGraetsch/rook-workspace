# Hardware & IoT

## Überblick

Single Board Computers, Hardware-Projekte, Sensorik. Bei Projekten wie Berlin TXL (Urban Data Platform) war Hardware-relevant — KML-Daten, GeoServer, IoT-Sensorik.

## SBC-Vergleich

| SBC | Stärken | Use Case |
|-----|---------|----------|
| Raspberry Pi | Community, Ecosystem | Prototyping, Hausautomation |
| Arduino | Einfach, analoge Inputs | Sensor-Projekte |
| ESP32 | WiFi/BT, günstig | IoT-Sensoren, Fernsteuerungen |
| Orange Pi | Preiswert, ARM64 | Edge-Computing |
| BeagleBone | PRU-Compiler, analoge I/Os | Industrial IoT |

## ESP32 Deep Dive

```arduino
// Typisches IoT-Sensor-Projekt
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "MyNetwork";
const char* password = "MyPassword";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  // Sensor auslesen, MQTT publish
}
```

**Anwendungen:**
- Temperatursensoren mit MQTT an Home Assistant
- Türsensoren, Bewegungsmelder
- Wasserzähler-Auslesung (Impulsgeber)

## Home Assistant

- Lokale Installation (kein Cloud-Zwang)
- ESPHome für ESP32-Integration
- Dashboard für Hausautomation

## Berlin TXL Verbindung

Bei der Urban Data Platform für den former Tegel Airport:
- GeoServer für Kartenvisualisierung
- CKAN für Metadaten
- IoT-Sensorik für Umweltdaten (Lärm, Luftqualität)

## Cross-References

- → [[cloud-kubernetes]] — K3s auf ARM-Board (RasPi Cluster)
- → [[linux-devops]] — SSH, Bash, Systemd auf SBCs
- → [[networking]] — WiFi, MQTT, Netzwerk-Stack

## Relevant Conversations

- Hardware-related conversations in workspace

---
*Zuletzt aktualisiert: 2026-05-01*
