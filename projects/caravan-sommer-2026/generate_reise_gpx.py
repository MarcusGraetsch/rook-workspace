#!/usr/bin/env python3
"""Generate a comprehensive GPX file for Marcus' France trip 28.07.-23.08.2026."""
import json
import re
from xml.sax.saxutils import escape

# ====== BRETAGNE-INITIATIVEN aus unserer DB ======
with open('/root/.openclaw/workspace/projects/caravan-sommer-2026/web/initiativen.js') as f:
    content = f.read()
m = re.search(r'window\.INITIATIVEN = (\[.*\]);', content, re.DOTALL)
data = json.loads(m.group(1))
bretagne_initiativen = [
    e for e in data if e.get('country') in ('France', 'FR') and (
        'bretag' in (e.get('region', '') + ' ' + e.get('address', '') + ' ' + e.get('name', '')).lower() or
        'brittany' in (e.get('region', '') + ' ' + e.get('address', '') + ' ' + e.get('name', '')).lower() or
        e.get('city', '') in ['Nantes', 'Vannes', 'Quimper', 'Brest', 'Rennes', 'Saint-Malo', 'Lorient', 'Saint-Nazaire']
    )
]

# ====== MANUELLE WEGPUNKTE ======
# (name, lat, lng, type, description)
WEGPUNKTE = [
    # === STRECKE 1: HINWEG BREMEN → NORMANDIE ===
    ("🚐 Bremen (Start)", 53.0793, 8.8017, "start", "Marcus' Start, 28.07. nachmittags"),
    ("🛣️ Eifel/Maas-Region (ÜN)", 50.3500, 6.5667, "uebernachtung", "Übernachtung 28./29.07., Eifel-Region"),
    ("📖 Reims - Eribon-Stadt", 49.2583, 4.0317, "sehenswuerdigkeit", "Didier Eribons Heimatstadt, 29.07. Dérogation ZFE Reims"),
    ("🎉 Saint-Jean-le-Blanc (ASF)", 48.9333, -0.6833, "termin", "ASF-Jubiläum 50 ans Volontaires au Bocage, 31.07.-02.08. 14770 Calvados"),
    ("🥖 Calvados-Land (ÜN-Tipps)", 49.0500, 0.2500, "uebernachtung", "Aires de Camping-Car rund um Caen"),

    # === D-DAY-STRÄNDE ===
    ("⚔️ Omaha Beach (Colleville)", 49.3586, -0.8503, "dday", "US-Landung, amerikanischer Soldatenfriedhof"),
    ("⚔️ Utah Beach (Sainte-Marie-du-Mont)", 49.3811, -1.1711, "dday", "US-Landung, D-Day-Museum"),
    ("⚔️ Gold Beach (Arromanches)", 49.3383, -0.6192, "dday", "Briten, künstliche Häfen Mulberry, Arromanches 360° Kino"),
    ("⚔️ Juno Beach (Courseulles)", 49.3308, -0.4567, "dday", "Kanadier, Juno Beach Centre"),
    ("⚔️ Sword Beach (Ouistreham)", 49.2792, -0.2581, "dday", "Briten, Pegasus-Brücke"),
    ("⚔️ Pointe du Hoc", 49.3944, -0.9789, "dday", "Rangers-Kletterfelsen"),
    ("🏛️ Mémorial de Caen", 49.1989, -0.3853, "museum", "D-Day-Museum, 1 Tag lohnend"),
    ("🧵 Bayeux - Tapestry", 49.2789, -0.7042, "sehenswuerdigkeit", "Bayeux-Tapestry, 1000-jähriger Wandteppich"),

    # === BRETAGNE HIGHLIGHTS ===
    ("🏰 Saint-Malo", 48.6493, -1.9992, "sehenswuerdigkeit", "Korsaren-Stadt, Festungswälle, 2 Tage"),
    ("🌊 Cap Fréhel", 48.6853, -2.3181, "sehenswuerdigkeit", "Steile Klippen, Leuchtturm"),
    ("🪨 Côte de Granit Rose (Ploumanac'h)", 48.8325, -3.4864, "sehenswuerdigkeit", "Rosa Granit-Felsen"),
    ("🏰 Dinan", 48.4500, -2.0333, "sehenswuerdigkeit", "Mittelalter-Altstadt"),
    ("🏘️ Concarneau", 47.8731, -3.9181, "sehenswuerdigkeit", "Ville Close, Fischerhafen"),
    ("⛪ Quimper", 47.9967, -4.0967, "sehenswuerdigkeit", "Kathedrale, bretonische Kultur"),
    ("🗿 Carnac (Megalithen)", 47.5850, -3.0781, "sehenswuerdigkeit", "Vorgeschichtliche Steinformationen"),
    ("🌊 Golfe du Morbihan", 47.5819, -2.8086, "sehenswuerdigkeit", "Traumhafte Bucht"),
    ("🌲 Huelgoat Forest", 48.3644, -3.7444, "sehenswuerdigkeit", "Verwunschener Wald"),

    # === INITIATIVEN AUS UNSERER DB ===
    ("💚 WWOOF Bretagne: Merdrignac", 48.1983, -2.3939, "initiative", "Experience sustainable living in Bretagne"),
    ("💚 WWOOF Landudec (Finistère)", 47.9856, -4.3118, "initiative", "Help create alternative way of living"),
    ("💚 HelpStay Central Brittany", 48.0870, -3.2877, "initiative", "Draft Horse Farm in Ploërdut"),
    ("💚 HelpStay Nantes (Abbaretz)", 47.2186, -1.5541, "initiative", "Join our family home"),

    # === CALAIS / MIGRATION ===
    ("🚢 Calais (Stadt)", 50.9513, 1.8587, "sehenswuerdigkeit", "Hafenstadt, Migrations-Hintergrund"),
    ("🤝 Grande-Synthe (MSF-Camp)", 51.0153, 2.3000, "humanitaer", "MSF-Camp 40 km von Calais, humanitärer Besuch"),
    ("🏘️ Auberge des Migrants (Calais)", 50.9450, 1.8630, "humanitaer", "Humanitäre Hilfsorganisation"),

    # === PARIS ===
    ("🏕️ CityKamp Paris (ÜN)", 48.8631, 2.2497, "uebernachtung", "Camping 4-Sterne, 75016 Bois de Boulogne"),
    ("🏘️ Belleville / Ménilmontant", 48.8722, 2.3819, "sehenswuerdigkeit", "Marché de Belleville, multikulti"),
    ("⚰️ Mur des Fédérés (Père Lachaise)", 48.8606, 2.3961, "sehenswuerdigkeit", "Commune 1871, 147 erschossene Arbeiter"),
    ("🌳 Père Lachaise (Friedhof)", 48.8617, 2.3934, "sehenswuerdigkeit", "Morrison, Wilde, Piaf, Communards"),
    ("🌍 Cité de l'Immigration", 48.8353, 2.4069, "museum", "Post-koloniale Migrationsgeschichte, Calais-Anschluss"),
    ("🎨 Musée du Louvre", 48.8606, 2.3376, "museum", "Tickets online! 22 €, 18.08. Mi 15-16 Uhr"),
    ("🏘️ Butte-aux-Cailles", 48.8264, 2.3519, "sehenswuerdigkeit", "Alternatives Viertel, 13. Arr."),
    ("📚 Shakespeare and Company", 48.8526, 2.3474, "sehenswuerdigkeit", "Legendäre Buchhandlung, 5. Arr."),
    ("⛪ Notre-Dame (außen)", 48.8530, 2.3499, "sehenswuerdigkeit", "Gotische Kathedrale, Baustelle"),

    # === HEIMWEG ===
    ("🛣️ Aachen (ÜN-Option)", 50.7753, 6.0833, "uebernachtung", "Heimweg-Übernachtung 21./22.08."),
    ("🛣️ Niederrhein (Heimweg)", 51.5833, 6.5000, "etappe", "Heimweg 22.08."),
    ("🏠 Berlin (Ziel)", 52.5200, 13.4050, "ziel", "Marcus' Ziel, 23.08."),
]

# ====== GPX GENERIEREN ======
gpx_lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Caravan-Sommer-2026"',
    '     xmlns="http://www.topografix.com/GPX/1/1"',
    '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    '  <metadata>',
    '    <name>Marcus Reise 28.07.-23.08.2026: Bremen → Normandie → Bretagne → Paris → Berlin</name>',
    '    <desc>Frankreich-Reise mit Hymer-Oldtimer H-Kennzeichen, 27 Tage, Wohnmobil-Stellplätze, Sehenswürdigkeiten, D-Day, Calais/Grande-Synthe, Paris</desc>',
    '    <author><name>Rook (Caravan-Sommer-2026)</name></author>',
    f'    <time>2026-07-07T19:00:00Z</time>',
    '  </metadata>',
]

# Add waypoints in groups
for name, lat, lng, wpt_type, desc in WEGPUNKTE:
    gpx_lines.append(f'  <wpt lat="{lat}" lon="{lng}">')
    gpx_lines.append(f'    <name>{escape(name)}</name>')
    gpx_lines.append(f'    <cmt>{escape(desc)}</cmt>')
    gpx_lines.append(f'    <desc>{escape(desc)}</desc>')
    gpx_lines.append(f'    <type>{wpt_type}</type>')
    gpx_lines.append(f'    <sym>{wpt_type[0]}</sym>')
    gpx_lines.append('  </wpt>')

# Add tracks (suggested routes as a single track for visualisation)
gpx_lines.append('  <trk>')
gpx_lines.append('    <name>Frankreich-Rundreise (Bremen → Berlin)</name>')
gpx_lines.append('    <type>roadtrip</type>')
gpx_lines.append('    <trkseg>')
ordered_route = [
    (53.0793, 8.8017),  # Bremen
    (50.3500, 6.5667),  # Eifel
    (49.2583, 4.0317),  # Reims
    (48.9333, -0.6833), # Saint-Jean-le-Blanc
    (49.3586, -0.8503), # Omaha Beach
    (49.3811, -1.1711), # Utah Beach
    (49.3944, -0.9789), # Pointe du Hoc
    (49.3383, -0.6192), # Gold Beach
    (49.3308, -0.4567), # Juno Beach
    (49.2792, -0.2581), # Sword Beach
    (49.1989, -0.3853), # Mémorial de Caen
    (48.6493, -1.9992), # Saint-Malo
    (48.6853, -2.3181), # Cap Fréhel
    (48.8325, -3.4864), # Côte de Granit Rose
    (48.4500, -2.0333), # Dinan
    (48.1983, -2.3939), # Merdrignac (Initiative)
    (47.9856, -4.3118), # Landudec (Initiative)
    (48.0870, -3.2877), # Ploërdut (Initiative)
    (48.3644, -3.7444), # Huelgoat
    (47.8731, -3.9181), # Concarneau
    (47.9967, -4.0967), # Quimper
    (47.5850, -3.0781), # Carnac
    (47.5819, -2.8086), # Golfe du Morbihan
    (50.9513, 1.8587),  # Calais
    (51.0153, 2.3000),  # Grande-Synthe (MSF)
    (48.8631, 2.2497),  # CityKamp Paris
    (48.8722, 2.3819),  # Belleville
    (48.8606, 2.3961),  # Mur des Fédérés
    (48.8617, 2.3934),  # Père Lachaise
    (48.8353, 2.4069),  # Cité Immigration
    (48.8606, 2.3376),  # Louvre
    (48.8264, 2.3519),  # Butte-aux-Cailles
    (48.8526, 2.3474),  # Shakespeare
    (50.7753, 6.0833),  # Aachen
    (52.5200, 13.4050), # Berlin
]
for lat, lng in ordered_route:
    gpx_lines.append(f'      <trkpt lat="{lat}" lon="{lng}"></trkpt>')
gpx_lines.append('    </trkseg>')
gpx_lines.append('  </trk>')
gpx_lines.append('</gpx>')

gpx_content = '\n'.join(gpx_lines)

# ====== SCHREIBEN ======
out_path = '/root/.openclaw/workspace/projects/caravan-sommer-2026/marcus-reise-2026.gpx'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(gpx_content)

# Validate
import os
size_kb = os.path.getsize(out_path) / 1024
print(f'GPX-File: {out_path} ({size_kb:.1f} KB)')
print(f'Wegpunkte: {len(WEGPUNKTE)}')
print(f'Bretagne-Initiativen: {len(bretagne_initiativen)}')
print(f'Route-Punkte: {len(ordered_route)}')

# Test XML parsing
import xml.etree.ElementTree as ET
tree = ET.parse(out_path)
root = tree.getroot()
print(f'XML valid: {root.tag}')
print(f'Children: {len(list(root))}')
PY
