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
        # Reasoning based on category and tags
        reasons = []
        if category == 'ai-policy':
            reasons.append("KI-Regulierung/Policy")
        elif category == 'surveillance':
            reasons.append("Überwachungskapitalismus")
        elif category == 'tech-criticism':
            reasons.append("Tech-Kritik (Cory Doctorow)")
        elif category == 'labor-de':
            reasons.append("Deutsche Arbeitswelt")
        
        if tags and 'KI' in str(tags):
            reasons.append("KI-Bezug")
        if tags and 'platform' in str(tags):
            reasons.append("Plattformökonomie")
        
        if word_count > 3000:
            reasons.append("Tiefgehende Analyse")
        
        reason_text = " + ".join(reasons) if reasons else "Relevant für Forschung"
        
        message += f"{i}. {title[:55]}...\n"
        message += f"   📝 {reason_text}\n"
        message += f"   👤 {author or 'N/A'} ({domain})\n"
        message += f"   📊 {word_count} Wörter\n\n"
    
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
