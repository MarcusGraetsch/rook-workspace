#!/usr/bin/env python3
"""
Weekly Telegram Digest Generator
Sends automatic summary every Sunday after newsletter scan
"""

import sqlite3
import os
from datetime import datetime, timedelta

RESEARCH_DIR = "/root/.openclaw/workspace/research"

def generate_weekly_digest():
    conn = sqlite3.connect(f'{RESEARCH_DIR}/articles.db')
    cursor = conn.cursor()
    
    # Count new articles
    cursor.execute('''
        SELECT COUNT(*) FROM articles
        WHERE created_at >= datetime('now', '-7 days')
    ''')
    new_count = cursor.fetchone()[0]
    
    # Top 5 articles with reasoning
    cursor.execute('''
        SELECT id, title, author, domain, category, word_count, tags, abstract
        FROM articles
        WHERE created_at >= datetime('now', '-7 days')
        AND word_count > 1500
        AND (category IN ('tech-policy', 'ai-policy', 'surveillance', 'tech-criticism', 'labor-de')
             OR tags LIKE '%KI%' OR tags LIKE '%platform%')
        ORDER BY 
            CASE 
                WHEN category IN ('tech-policy', 'ai-policy') THEN 3
                WHEN category IN ('surveillance', 'tech-criticism') THEN 2
                ELSE 1
            END DESC,
            word_count DESC
        LIMIT 5
    ''')
    
    top5 = cursor.fetchall()
    conn.close()
    
    # Generate message
    message = f"📊 WEEKLY RESEARCH DIGEST\n"
    message += f"📅 {datetime.now().strftime('%d.%m.%Y')}\n"
    message += "=" * 40 + "\n\n"
    message += f"📈 Diese Woche: {new_count} neue Artikel\n"
    message += f"📦 Gesamt: ~1800 Artikel in DB\n\n"
    message += "🔥 TOP 5 HIGHLIGHTS:\n\n"
    
    for i, (id_, title, author, domain, category, word_count, tags, abstract) in enumerate(top5, 1):
        # Detailed reasoning for Digital Capitalism research
        reasons = []
        
        # 1. Thematic relevance (why this matters)
        if category == 'surveillance':
            reasons.append("🎯 ZENTRAL: Überwachungskapitalismus (Zuboff)")
        elif category == 'tech-criticism':
            if 'doctorow' in str(author).lower() or 'pluralistic' in str(domain).lower():
                reasons.append("🎯 AUTORITÄT: Cory Doctorow")
            else:
                reasons.append("🎯 Fundamentale Tech-Kritik")
        elif category == 'tech-policy':
            reasons.append("🎯 POLICY: Big Tech Regulierung")
        elif category == 'ai-policy':
            reasons.append("🎯 AKTUELL: KI & Arbeitswelt")
        elif category == 'labor-de':
            reasons.append("🎯 ARBEIT: Platform Economy DE")
        
        # 2. Depth of analysis (why this is substantial)
        if word_count > 3000:
            reasons.append(f"📊 TIEFGÄNGIG: {word_count} Wörter")
        elif word_count > 2000:
            reasons.append(f"📊 Anspruchsvoll: {word_count} Wörter")
        
        # 3. Source quality (why this is trustworthy)
        high_quality = ['pluralistic.net', 'verfassungsblog.de', 'netzpolitik.org', 
                       'jacobin.com', 'platformer.news', 'theintercept.com']
        if any(src in str(domain).lower() for src in high_quality):
            reasons.append(f"✅ PREMIUM: {domain}")
        
        # 4. Research tags (specific focus areas)
        if tags:
            if 'platform' in str(tags).lower():
                reasons.append("🏷️ Plattformökonomie")
            if 'labor' in str(tags).lower() or 'arbeit' in str(tags).lower():
                reasons.append("🏷️ Gig Economy")
            if 'surveillance' in str(tags).lower():
                reasons.append("🏷️ Überwachung")
        
        reason_text = "\n   ".join(reasons) if reasons else "Relevant für Forschung"
        
        message += f"{i}. {title[:55]}...\n"
        message += f"   👤 {author or 'N/A'}\n"
        message += f"   {reason_text}\n\n"
    
    message += "=" * 40 + "\n"
    message += "💡 Tipp: Antworte mit der Nummer (1-5)\n"
    message += "für Zusammenfassung eines Artikels!"
    
    return message

if __name__ == "__main__":
    digest = generate_weekly_digest()
    print(digest)
    
    # Send via Telegram (if TELEGRAM_TOKEN and CHAT_ID set)
    token = os.getenv('TELEGRAM_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    if token and chat_id:
        import requests
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(url, json={"chat_id": chat_id, "text": digest, "parse_mode": "HTML"})
        print("\n✅ Telegram message sent!")
    else:
        print("\nℹ️  TELEGRAM_TOKEN/CHAT_ID not set - printing only")
