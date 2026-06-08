#!/usr/bin/env python3
"""Parse ki-experimente-chronologie.md and distribute into 23 category files."""

import re
import os

SOURCE_FILE = "/root/.openclaw/workspace/research/ki-experimente-chronologie.md"
OUTPUT_DIR = "/root/.openclaw/workspace/research/ki-chronologie"

# Category definitions with keywords for classification
CATEGORIES = {
    "01-antike-bis-1900": {
        "title": "01 - Antike bis 1900 (Mythische Wurzeln, Automaten, Frühe Maschinen)",
        "keywords": ["antike", "mittelalter", "automat", "hero", "al-jazari", "regiomontanus", "leonardo", "kempelen", "maillardet", "poe", "hawthorne", "bulwer", "bellamy", "morris", "400 bce", "10–70 ce", "1206", "13th century", "15th century", "1495", "1770", "1800", "1836", "1843", "1858", "1871", "1888", "1890", "1895", "1898", "1901"]
    },
    "02-1900-1960": {
        "title": "02 - 1900–1960 (Kybernetik, Turing, Frühe Computer)",
        "keywords": ["1900", "1910", "1911", "1914", "1920", "1923", "1924", "1925", "1926", "1927", "1930", "1932", "1933", "1945", "1949", "1950", "1951", "1952", "1953", "1954", "1955", "1956", "1957", "1958", "1959", "1960", "turing", "wiener", "cybernetics", "macy conferences", "von neumann", "shannon", "bush", "dartmouth", "mcculloch", "rosenblatt", "perceptron", "logic theorist", "general problem solver", "samuel", "checkers", "deep blue", "cybernetic", "kybernetik", "feedback"]
    },
    "03-1960-2000": {
        "title": "03 - 1960–2000 (KI-Winter, Expertensysteme, Frühes Internet)",
        "keywords": ["1961", "1962", "1963", "1964", "1965", "1966", "1967", "1968", "1969", "1970", "1971", "1972", "1973", "1974", "1975", "1976", "1977", "1978", "1979", "1980", "1981", "1982", "1983", "1984", "1985", "1986", "1987", "1988", "1989", "1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997", "1998", "1999", "2000", "expertensystem", "ki-winter", "ai winter", " Cyc", "ALICE", "ELIZA", "MYCIN", "DENDRAL", "SHRDLU", "jabberwacky", "cleverbot"]
    },
    "04-2000-2026": {
        "title": "04 - 2000–2026 (Deep Learning, Big Tech, Aktuelle KI)",
        "keywords": ["2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026", "deep learning", "gpt", "openai", "deepmind", "alphago", "alphazero", "muzero", "lamda", "palm", "gemini", "claude", "llama", "mistral", "transformer", "neural network", "reinforcement learning", "llm", "large language", "generative", "chatbot", "watson", "IBM", "google", "meta", "microsoft", "amazon"]
    },
    "05-kunst-kultur": {
        "title": "05 - Kunst & Kultur (Film, Musik, Literatur, Kunst)",
        "keywords": ["film", "movie", "serie", "tv series", "cartoon", "comic", "manga", "anime", "music", "musik", "album", "song", "soundtrack", "kunst", "art", "visual", "sculpture", "painting", "literature", "literatur", "roman", "novel", "short story", "dystopie", "utopie", "sf", "science fiction", "poetry", "theater", "opera", "phantom"]
    },
    "06-theorie-kritik": {
        "title": "06 - Theorie & Kritik (Philosophie, Kritische Theorie, Posthumanismus)",
        "keywords": ["theorie", "theory", "kritik", "critique", "posthuman", "transhuman", "philosophie", "philosophy", "epistemology", "ontolog", "phenomenology", "phänomenologie", "hermeneutik", "semiotics", "semiotik", "deconstruction", "dekonstruktion", "critical theory", "kritische theorie", "frankfurt", "adorno", "horkheimer", "marcuse", "habermas", "benjamin", "foucault", "deleuze", "guattari", "latour", "haraway", "posthumanism", "transhumanism"]
    },
    "07-games": {
        "title": "07 - Games (Videospiele, NPCs, Procedural Generation)",
        "keywords": ["game", "spiel", "videogame", "videospiel", "npc", "player", "level", "adventure", "strategy", "rpg", "shooter", "simulation", "simcity", "civilization", "starcraft", "portal", "minecraft", "dwarf fortress", "rimworld", "elite", "zork", "colossal cave", "procedural generation", "prozedural", "boss", "quest", "multiplayer", "mmorpg", "mmo", "esports", "speedrun", "mod", "modding"]
    },
    "08-philosophie": {
        "title": "08 - Philosophie (Bewusstsein, Ethik, KI-Denken)",
        "keywords": ["plato", "aristotle", "aristoteles", "descartes", "hume", "kant", "nietzsche", "heidegger", "wittgenstein", "ryle", "chalmers", "dennett", "searle", "dreyfus", "bostrom", "russell", "consciousness", "bewusstsein", "ethik", "ethics", "morality", "moral", "free will", "freier wille", "mind-body", "dualism", "dualismus", "qualia", "intentionality", "intentionalität", "phenomenology", "phänomenologie", "epistemology", "erkenntnistheorie", "ontology", "ontologie"]
    },
    "09-kritische-theorie": {
        "title": "09 - Kritische Theorie (Frankfurt School, Marxismus, KI-Kritik)",
        "keywords": ["frankfurt school", "frankfurter schule", "marx", "marxismus", "capitalism", "kapitalismus", "adorno", "horkheimer", "marcuse", "habermas", "benjamin", "fromm", "critical theory", "kritische theorie", "dialectic", "dialektik", "ideology", "ideologie", "commodity", "ware", "reification", "verdinglichung", "alienation", "entfremdung", "bourgeois", "proletariat", "class struggle", "klassenkampf", "surplus value", "mehrwert", "labor theory", "arbeit", "production", "produktion"]
    },
    "10-feminist-postkolonial": {
        "title": "10 - Feminist & Postkolonial (Gender, Rasse, Dekolonisierung)",
        "keywords": ["feminist", "gender", "women", "frau", "feminismus", "patriarch", "cyborg manifesto", "haraway", "plant", "hayles", "suchman", "turkle", "browne", "benjamin", "noble", "buolamwini", "algorithmic justice", "race", "rasse", "racial", "postcolonial", "postkolonial", "decolon", "dekolonis", "intersectional", "intersektional", "queer", "trans", "black", "indigenous", "marginalized", "marginalisiert", "equity", "gleichheit", "inclusion", "inklusion"]
    },
    "11-arbeit-oekonomie": {
        "title": "11 - Arbeit & Ökonomie (Automation, UBI, Gig Economy)",
        "keywords": ["arbeit", "work", "labor", "arbeitnehmer", "worker", "automation", "automatisierung", "job", "employment", "unemployment", "arbeitslos", "ubi", "basic income", "grundeinkommen", "economy", "ökonomie", "wirtschaft", "capitalism", "kapitalismus", "neoliberal", "platform capitalism", "gig economy", "precariat", "precariat", "wealth", "reichtum", "inequality", "ungleichheit", "productivity", "produktivität", "wage", "lohn", "salary", "gehalt", "ford", "bellamy", "morris", "rifkin", "ford", "brynjolfsson", "mcafee", "lee", "srnicek", "bastani", "yang"]
    },
    "12-recht-ethik": {
        "title": "12 - Recht & Ethik (AI Act, Copyright, Haftung)",
        "keywords": ["recht", "law", "legal", "gesetz", "ai act", "regulation", "regulierung", "regulatory", "policy", "politik", "governance", "copyright", "urheberrecht", "patent", "intellectual property", "geistiges eigentum", "liability", "haftung", "ethics", "ethik", "moral", "rights", "rechte", "privacy", "datenschutz", "gdpr", "dsgvo", "accountability", "transparency", "explainability", "erklärbarkeit", "fairness", "bias", "verzerrung", "discrimination", "diskriminierung", "compliance", "conformity"]
    },
    "13-klima-oekologie": {
        "title": "13 - Klima & Ökologie (Energie, Umwelt, Nachhaltigkeit)",
        "keywords": ["climate", "klima", "environment", "umwelt", "ecology", "ökologie", "energy", "energie", "sustainability", "nachhaltigkeit", "green", "grün", "carbon", "kohlenstoff", "emission", "pollution", "verschmutzung", "renewable", "erneuerbar", "solar", "wind", "nuclear", "kernenergie", "fossil", "biodiversity", "biologische vielfalt", "extinction", "aussterben", "conservation", "erhaltung", "earth", "erde", "planet", "nature", "natur"]
    },
    "14-bildung-gesundheit": {
        "title": "14 - Bildung & Gesundheit (EdTech, Medizin, Therapie)",
        "keywords": ["education", "bildung", "edtech", "learning", "lernen", "school", "schule", "university", "universität", "academia", "akademie", "health", "gesundheit", "medicine", "medizin", "medical", "therapy", "therapie", "diagnosis", "diagnose", "treatment", "behandlung", "drug", "medikament", "pharma", "patient", "doctor", "arzt", "nurse", "krankenpflege", "hospital", "krankenhaus", "clinical", "klinisch", "mental health", "psychische", "psychology", "psychologie", "cognitive", "kognitiv", "neuroscience", "neurowissenschaft", "brain", "gehirn", "disability", "behinderung", "accessibility", "barrierefreiheit"]
    },
    "15-vergessene-nischen": {
        "title": "15 - Vergessene Nischen (Unterrepräsentierte KI-Geschichten)",
        "keywords": ["vergessen", "forgotten", "nische", "niche", "underrepresented", "unterrepräsentiert", "minority", "minderheit", "indigenous", "einheimisch", "local", "lokal", "regional", "non-western", "nicht-westlich", "global south", "globaler süden", "alternative", "radical", "radikal", "experimental", "experimentell", "pioneer", "pionier", "early", "früh", "lost", "obscure", "unklar", "hidden", "verborgen", "unknown", "unbekannt", "archive", "archiv", "oral history", "mündliche geschichte", "grassroots", "basisbewegung", "community", "gemeinschaft", "diy", "hacker", "maker", "fanzine", "zine"]
    },
    "16-religion-spiritualitaet": {
        "title": "16 - Religion & Spiritualität (KI und Glaube, Transhumanismus)",
        "keywords": ["religion", "religiös", "spiritual", "spiritualität", "faith", "glaube", "god", "gott", "divine", "göttlich", "sacred", "heilig", "soul", "seele", "transcendence", "transzendenz", "transhuman", "transhumanism", "transhumanismus", "immortality", "unsterblichkeit", "afterlife", "jenseits", "heaven", "himmel", "hell", "hölle", "sin", "sünde", "redemption", "erlösung", "salvation", "heil", "apocalypse", "apokalypse", "prophecy", "prophezeiung", "mysticism", "mystik", "theology", "theologie", "buddhism", "buddhismus", "hinduism", "hinduismus", "islam", "christianity", "christentum", "judaism", "judentum", "shinto", "daoism", "taoism"]
    },
    "17-sport-wettkampf": {
        "title": "17 - Sport & Wettkampf (AlphaGo, Training, Analyse)",
        "keywords": ["sport", "athletics", "athletik", "competition", "wettkampf", "game", "spiel", "match", "tournament", "turnier", "olympics", "olympia", "chess", "schach", "go", "baduk", "shogi", "alphaGo", "alphaZero", "deep blue", "leela", "stockfish", "training", "training", "coach", "trainer", "fitness", "workout", "performance", "leistung", "analytics", "analyse", "stats", "statistik", "strategy", "strategie", "tactics", "taktik", "esports", "doping", "biomechanics", "biomechanik", "motion capture", "wearable", "sensor"]
    },
    "18-mode-design": {
        "title": "18 - Mode & Design (Generative Mode, Algorithmisches Design)",
        "keywords": ["fashion", "mode", "design", "architecture", "architektur", "generative", "algorithmic", "parametric", "style", "stil", "aesthetic", "ästhetik", "beauty", "schönheit", "form", "function", "funktion", "material", "textile", "textil", "fabric", "gewebe", "pattern", "muster", "color", "farbe", "shape", "form", "visual", "visuell", "graphic", "grafik", "interior", "innenraum", "product", "produkt", "industrial", "industrie", "ux", "ui", "interface", "interaction", "interaktion"]
    },
    "19-militaer-sicherheit": {
        "title": "19 - Militär & Sicherheit (Autonome Waffen, Cyberwar)",
        "keywords": ["military", "militär", "war", "krieg", "weapon", "waffe", "autonomous weapon", "autonome waffe", "drone", "drohne", "surveillance", "überwachung", "security", "sicherheit", "defense", "verteidigung", "army", "armee", "navy", "marine", "air force", "luftwaffe", "cyberwar", "cyberwarfare", "cyber", "hacking", "hack", "attack", "angriff", "threat", "bedrohung", "terror", "intelligence", "nachrichtendienst", "spy", "spionage", "nuclear", "nuklear", "atom", "missile", "rakete", "darpa", "pentagon", "nato", "warfare", "kriegsführung", "conflict", "konflikt"]
    },
    "20-politik-medien": {
        "title": "20 - Politik & Medien (Desinformation, Wahlmanipulation, Journalismus)",
        "keywords": ["politics", "politik", "political", "politisch", "government", "regierung", "state", "staat", "democracy", "demokratie", "election", "wahl", "vote", "stimme", "party", "partei", "media", "medien", "journalism", "journalismus", "news", "nachrichten", "press", "presse", "broadcast", "rundfunk", "tv", "radio", "social media", "desinformation", "disinformation", "misinformation", "fake news", "propaganda", "manipulation", "manipulation", "deepfake", "bot", "troll", "campaign", "kampagne", "public opinion", "öffentliche meinung", "censorship", "zensur", "freedom of speech", "meinungsfreiheit", "whistleblower", "leak", "investigation", "recherche", "reporting", "berichterstattung"]
    },
    "21-finanzen-wirtschaft": {
        "title": "21 - Finanzen & Wirtschaft (HFT, Krypto, Algorithmisches Trading)",
        "keywords": ["finance", "finanzen", "financial", "wirtschaft", "economy", "ökonomie", "market", "markt", "stock", "aktie", "bond", "anleihe", "trading", "handel", "algorithmic trading", "high-frequency", "hft", "crypto", "krypto", "bitcoin", "blockchain", "ethereum", "nft", "bank", "banking", "investment", "investition", "hedge fund", "hedgefonds", "venture capital", "risikokapital", "fintech", "insurance", "versicherung", "risk", "risiko", "credit", "kredit", "loan", "darlehen", "debt", "schulden", "interest", "zins", "price", "preis", "value", "wert", "asset", "vermögen", "wealth", "reichtum", "poverty", "armut", "monopoly", "monopol", "oligopoly", "oligopol"]
    },
    "22-international": {
        "title": "22 - International (China, EU, Global South)",
        "keywords": ["china", "chinese", "chinesisch", "eu", "europe", "europa", "european", "europäisch", "global south", "globaler süden", "africa", "afrika", "african", "afrikanisch", "india", "indien", "indian", "indisch", "brazil", "brasilien", "latin america", "lateinamerika", "middle east", "naher osten", "asia", "asien", "asian", "asiatisch", "pacific", "pazifik", "international", "global", "nation", "nation", "country", "land", "border", "grenze", "immigration", "einwanderung", "migration", "refugee", "flüchtling", "diplomacy", "diplomatie", "treaty", "vertrag", "agreement", "abkommen", "sanction", "sanktion", "embargo", "trade", "handel", "tariff", "zoll", "cooperation", "kooperation", "conflict", "konflikt", "geopolitic", "geopolitik"]
    },
    "23-wissenschaft-forschung": {
        "title": "23 - Wissenschaft & Forschung (Forschungs-KI, Open Science, Akademie)",
        "keywords": ["science", "wissenschaft", "research", "forschung", "scientific", "wissenschaftlich", "academic", "akademisch", "university", "universität", "phd", "dissertation", "thesis", "dissertation", "paper", "paper", "publication", "publikation", "journal", "zeitschrift", "peer review", "open science", "open access", "reproducibility", "reproduzierbarkeit", "citation", "zitation", "bibliography", "bibliographie", "library", "bibliothek", "archive", "archiv", "laboratory", "labor", "experiment", "experiment", "hypothesis", "hypothese", "theory", "theorie", "model", "modell", "simulation", "data", "daten", "dataset", "datensatz", "benchmark", "evaluation", "evaluierung", "metric", "metrik", "arxiv", "nature", "science journal", "conference", "konferenz", "workshop", "symposium", "funding", "förderung", "grant", "stipendium", "scholarship", "stipendium"]
    }
}

def read_entries(filename):
    """Read and parse entries from the source file."""
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Split by "### " to get individual entries
    entries = []
    sections = content.split("\n## ")
    
    for section in sections:
        # Split section into sub-entries by ###
        sub_entries = section.split("\n### ")
        for i, entry in enumerate(sub_entries):
            if i == 0:
                # This is the section header
                if entry.strip():
                    entries.append(("section_header", entry.strip()))
            else:
                entry = "### " + entry
                if entry.strip():
                    entries.append(("entry", entry.strip()))
    
    return entries

def classify_entry(entry_text, categories):
    """Classify an entry into a category based on keywords."""
    text_lower = entry_text.lower()
    scores = {}
    
    for cat_key, cat_info in categories.items():
        score = 0
        for keyword in cat_info["keywords"]:
            if keyword.lower() in text_lower:
                score += 1
        scores[cat_key] = score
    
    # Return the category with highest score, or None if no match
    if scores:
        max_score = max(scores.values())
        if max_score > 0:
            best_cat = max(scores, key=scores.get)
            return best_cat
    
    return None

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    entries = read_entries(SOURCE_FILE)
    
    # Initialize category buckets
    category_entries = {cat: [] for cat in CATEGORIES}
    
    # Distribute entries
    for entry_type, entry_text in entries:
        if entry_type == "section_header":
            # Try to find a category for the section header
            cat = classify_entry(entry_text, CATEGORIES)
            if cat:
                category_entries[cat].append((entry_type, entry_text))
        else:
            cat = classify_entry(entry_text, CATEGORIES)
            if cat:
                category_entries[cat].append((entry_type, entry_text))
    
    # Print statistics
    for cat, entries_list in category_entries.items():
        print(f"{cat}: {len(entries_list)} entries")
    
    # Write files
    for cat_key, cat_info in CATEGORIES.items():
        entries_list = category_entries[cat_key]
        if entries_list:
            filename = os.path.join(OUTPUT_DIR, f"ki-chronologie-{cat_key}.md")
            with open(filename, "w", encoding="utf-8") as f:
                f.write(f"# {cat_info['title']}\n\n")
                f.write(f"> Teil der KI-Chronologie-Sammlung\n")
                f.write(f"> Extrahiert aus: ki-experimente-chronologie.md\n\n")
                
                for entry_type, entry_text in entries_list:
                    if entry_type == "section_header":
                        f.write(f"\n## {entry_text}\n\n")
                    else:
                        f.write(f"{entry_text}\n\n")
    
    print(f"\nFiles written to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
