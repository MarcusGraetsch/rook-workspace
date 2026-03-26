#!/usr/bin/env python3
"""
Weekly Research Briefing Generator

Generates an automated research briefing every Sunday with:
- New articles from newsletters
- Task progress updates
- New connections in ontology
- Gap analysis (underrepresented topics)
- Reading recommendation of the week
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter, defaultdict
import subprocess

RESEARCH_DIR = Path('/root/.openclaw/workspace')
DB_FILE = RESEARCH_DIR / 'research' / 'articles.db'
ONTOLOGY_FILE = RESEARCH_DIR / 'memory' / 'ontology' / 'graph.jsonl'
BRIEFING_FILE = RESEARCH_DIR / 'briefings'


def get_new_articles_this_week():
    """Get articles added in the last 7 days."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    cursor.execute('''
        SELECT id, title, domain, category, tags, abstract, word_count, created_at
        FROM articles
        WHERE created_at > ?
        ORDER BY created_at DESC
    ''', (week_ago,))
    
    articles = cursor.fetchall()
    conn.close()
    return articles


def get_task_progress():
    """Analyze task progress based on related articles."""
    if not ONTOLOGY_FILE.exists():
        return []
    
    with open(ONTOLOGY_FILE, 'r') as f:
        entries = [json.loads(line) for line in f if line.strip()]
    
    tasks = [e for e in entries if e.get('entity', {}).get('type') == 'ResearchTask']
    concepts = {e['entity']['id']: e for e in entries if e.get('entity', {}).get('type') == 'Concept'}
    
    task_progress = []
    
    for task in tasks:
        task_id = task['entity']['id']
        task_name = task['entity']['properties']['title']
        related_concepts = task['entity']['properties'].get('related_concepts', [])
        
        # Count articles related to this task's concepts
        article_count = 0
        for concept_id in related_concepts:
            # Count relations from articles to this concept
            for entry in entries:
                if entry.get('op') == 'relate' and entry.get('to') == concept_id:
                    article_count += 1
        
        task_progress.append({
            'name': task_name,
            'articles': article_count,
            'priority': task['entity']['properties'].get('priority', 'medium'),
            'due': task['entity']['properties'].get('due_date', 'unknown')[:10]
        })
    
    return sorted(task_progress, key=lambda x: x['articles'], reverse=True)


def find_gaps():
    """Find underrepresented topics in recent articles."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    # Get recent tags
    cursor.execute('''
        SELECT tags FROM articles
        WHERE created_at > ? AND tags IS NOT NULL
    ''', (week_ago,))
    
    recent_tags = []
    for row in cursor.fetchall():
        if row[0]:
            recent_tags.extend(row[0].split(', '))
    
    conn.close()
    
    tag_counts = Counter(recent_tags)
    
    # Define expected topics
    expected_topics = {
        'KI': 5,
        'Arbeitswelt': 3,
        'Big Tech': 2,
        'Plattformökonomie': 1,
        'Überwachung': 1,
        'Green Tech': 1,  # New environmental focus
        'Data Center': 1,
    }
    
    gaps = []
    for topic, expected in expected_topics.items():
        actual = tag_counts.get(topic, 0)
        if actual < expected:
            gaps.append({
                'topic': topic,
                'expected': expected,
                'actual': actual,
                'gap': expected - actual
            })
    
    return gaps


def get_reading_recommendation():
    """Find the best article of the week."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    # Score articles by: word_count (substantial), high-priority source, has abstract
    cursor.execute('''
        SELECT id, title, domain, abstract, word_count, url
        FROM articles
        WHERE created_at > ? AND word_count > 500
        ORDER BY word_count DESC
        LIMIT 5
    ''', (week_ago,))
    
    candidates = cursor.fetchall()
    conn.close()
    
    if not candidates:
        return None
    
    # Score candidates
    high_quality_sources = ['netzpolitik.org', 'verfassungsblog.de', 'monde-diplomatique.de', 
                           'newleftreview.org', 'jacobin.com', 'themarkup.org']
    
    best = None
    best_score = 0
    
    for article in candidates:
        id, title, domain, abstract, word_count, url = article
        score = 0
        
        # Word count (substantial content)
        score += min(word_count / 100, 10)
        
        # Quality source
        if domain in high_quality_sources:
            score += 5
        
        # Has abstract
        if abstract and len(abstract) > 100:
            score += 3
        
        if score > best_score:
            best_score = score
            best = {
                'title': title,
                'domain': domain,
                'abstract': abstract[:300] + '...' if abstract and len(abstract) > 300 else abstract,
                'word_count': word_count,
                'url': url
            }
    
    return best


def generate_briefing():
    """Generate the complete weekly briefing."""
    
    # Gather data
    new_articles = get_new_articles_this_week()
    task_progress = get_task_progress()
    gaps = find_gaps()
    recommendation = get_reading_recommendation()
    
    # Build briefing
    lines = [
        "# 📊 Weekly Research Briefing",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "## 📈 This Week's Summary",
        f"- **{len(new_articles)}** new articles collected",
        f"- **{len([t for t in task_progress if t['articles'] > 0])}** research tasks with new material",
    ]
    
    if gaps:
        lines.append(f"- **{len(gaps)}** topics underrepresented (see gaps section)")
    
    lines.extend([
        "",
        "## 📚 New Articles",
        f"*{len(new_articles)} articles from your newsletters this week*",
        "",
    ])
    
    # Top 5 new articles
    for i, article in enumerate(new_articles[:5], 1):
        id, title, domain, category, tags, abstract, word_count, created_at = article
        lines.append(f"{i}. **{title}** ({domain})")
        if abstract:
            lines.append(f"   {abstract[:150]}...")
        if tags:
            lines.append(f"   🏷️ {tags}")
        lines.append("")
    
    # Task progress
    lines.extend([
        "## 🎯 Research Task Progress",
        "",
    ])
    
    for task in task_progress[:5]:
        emoji = "🔴" if task['priority'] == 'high' else "🟡" if task['priority'] == 'medium' else "🟢"
        lines.append(f"{emoji} **{task['name']}**")
        lines.append(f"   {task['articles']} related articles | Due: {task['due']}")
        lines.append("")
    
    # Gaps
    if gaps:
        lines.extend([
            "## ⚠️ Coverage Gaps",
            "*Topics that received less attention than expected:*",
            "",
        ])
        
        for gap in gaps[:5]:
            lines.append(f"- **{gap['topic']}**: {gap['actual']}/{gap['expected']} articles (gap: {gap['gap']})")
        
        lines.append("")
        lines.append("💡 *Consider searching for these topics specifically or adding relevant newsletters*")
        lines.append("")
    
    # Reading recommendation
    if recommendation:
        lines.extend([
            "## 📖 Reading Recommendation of the Week",
            "",
            f"**{recommendation['title']}**",
            f"*Source: {recommendation['domain']} | {recommendation['word_count']} words*",
            "",
            f"{recommendation['abstract']}",
            "",
        ])
        if recommendation['url']:
            lines.append(f"🔗 {recommendation['url']}")
            lines.append("")
    
    # Next steps
    lines.extend([
        "---",
        "",
        "## 🚀 Suggested Next Steps",
        "",
        "1. Review new articles in the dashboard",
        "2. Check task deadlines and prioritize",
        "3. Fill coverage gaps with targeted searches",
        "4. Update ontology with new connections",
        "",
        "---",
        "*This briefing was automatically generated by your Digital Capitalism Research Assistant*",
    ])
    
    return "\n".join(lines)


def save_and_send_briefing():
    """Generate, save, and send the briefing via Telegram."""
    print("🔄 Generating weekly briefing...")
    
    briefing = generate_briefing()
    
    # Save to file
    BRIEFING_FILE.mkdir(exist_ok=True)
    filename = f"briefing_{datetime.now().strftime('%Y%m%d')}.md"
    filepath = BRIEFING_FILE / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(briefing)
    
    print(f"✅ Briefing saved: {filepath}")
    
    # Also save as latest
    latest_path = BRIEFING_FILE / 'latest.md'
    with open(latest_path, 'w', encoding='utf-8') as f:
        f.write(briefing)
    
    # Send via Telegram
    print("📤 Sending briefing via Telegram...")
    try:
        # Format for Telegram (truncate if too long)
        telegram_msg = format_for_telegram(briefing)
        
        # Use OpenClaw's message tool or curl
        import urllib.request
        import urllib.parse
        
        # Get bot token from environment or config
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        chat_id = "549758481"  # Marcus' chat ID
        
        if bot_token:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = urllib.parse.urlencode({
                'chat_id': chat_id,
                'text': telegram_msg,
                'parse_mode': 'Markdown'
            }).encode()
            
            req = urllib.request.Request(url, data=data, method='POST')
            with urllib.request.urlopen(req, timeout=30) as response:
                if response.status == 200:
                    print("   ✅ Briefing sent via Telegram")
                else:
                    print(f"   ⚠️  Telegram API returned status {response.status}")
        else:
            # Fallback: save to file for manual sending
            telegram_file = BRIEFING_FILE / f'telegram_{datetime.now().strftime("%Y%m%d")}.txt'
            with open(telegram_file, 'w', encoding='utf-8') as f:
                f.write(telegram_msg)
            print(f"   📝 Telegram message saved to: {telegram_file}")
            print("   💡 Set TELEGRAM_BOT_TOKEN environment variable for automatic sending")
            
    except Exception as e:
        print(f"   ⚠️  Telegram sending failed: {e}")
        # Save anyway for manual sending
        telegram_file = BRIEFING_FILE / f'telegram_{datetime.now().strftime("%Y%m%d")}.txt'
        with open(telegram_file, 'w', encoding='utf-8') as f:
            f.write(format_for_telegram(briefing))
    
    # Print summary
    print("\n" + "="*60)
    print("BRIEFING SUMMARY")
    print("="*60)
    print(briefing[:1000])
    print("...")
    print(f"\nFull briefing: {filepath}")
    
    return filepath


def format_for_telegram(briefing):
    """Format briefing for Telegram (max 4000 chars, proper markdown)."""
    # Telegram has 4096 char limit, so we create a summary
    lines = briefing.split('\n')
    
    telegram_lines = [
        "📊 *Weekly Research Briefing*",
        f"_{datetime.now().strftime('%Y-%m-%d')}_",
        ""
    ]
    
    # Extract key sections
    in_summary = False
    in_articles = False
    article_count = 0
    
    for line in lines:
        # Summary section
        if "## 📈 This Week's Summary" in line:
            in_summary = True
            telegram_lines.append("📈 *This Week:*")
            continue
        elif line.startswith("## ") and in_summary:
            in_summary = False
            
        if in_summary and line.strip() and not line.startswith('#'):
            # Clean up markdown for Telegram
            clean_line = line.replace('**', '*').replace('- **', '• ')
            telegram_lines.append(clean_line)
        
        # First 3 articles only (to save space)
        if "## 📚 New Articles" in line:
            in_articles = True
            telegram_lines.append("")
            telegram_lines.append("📚 *Top Articles:*")
            continue
        elif line.startswith("## ") and in_articles:
            in_articles = False
            
        if in_articles and line.strip().startswith(('1.', '2.', '3.')):
            clean_line = line.replace('**', '*')
            telegram_lines.append(clean_line)
            article_count += 1
            if article_count >= 3:
                in_articles = False
    
    # Add link to full briefing
    telegram_lines.extend([
        "",
        "📄 *Full briefing with all details:*",
        f"GitHub: github.com/MarcusGraetsch/digital-capitalism-research/blob/master/briefings/latest.md"
    ])
    
    result = '\n'.join(telegram_lines)
    
    # Truncate if still too long
    if len(result) > 4000:
        result = result[:3990] + "\n\n..."
    
    return result


if __name__ == '__main__':
    save_and_send_briefing()
