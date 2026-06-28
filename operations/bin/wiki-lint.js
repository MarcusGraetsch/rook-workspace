#!/usr/bin/env node
/**
 * wiki-lint.js — Automated Wiki Health Check
 * 
 * Checks:
 * 1. Orphan pages (wissensbasis.md < 30 lines)
 * 2. Missing cross-references (grep for [[...]])
 * 3. Outdated info (no updates in 90+ days)
 * 4. Schema compliance (wissensbasis.md exists per topic)
 * 
 * Outputs: wiki/wiki-lint-report.md
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WIKI_ROOT = '/root/.openclaw/workspace/wiki';
const TOPICS_DIR = join(WIKI_ROOT, 'topics');

// Config
const MIN_TOPIC_LINES = 50; // raised from 30 (2026-06-28, per Wiki-Review)
const OUTDATED_DAYS = 90;

// Colors for console output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(msg, level = 'info') {
  const prefix = level === 'error' ? `${RED}✗${RESET}` : 
                 level === 'warn' ? `${YELLOW}⚠${RESET}` : 
                 `${GREEN}✓${RESET}`;
  console.log(`${prefix} ${msg}`);
}

function getFileAge(filePath) {
  const now = Date.now();
  const mtime = statSync(filePath).mtimeMs;
  return Math.floor((now - mtime) / (1000 * 60 * 60 * 24));
}

function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function hasCrossRefs(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const matches = content.match(/\[\[[^\]]+\]\]/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

function lintTopic(topicName, topicPath) {
  const wissensbasisPath = join(topicPath, 'wissensbasis.md');
  
  // Skip topics without wissensbasis.md
  let lines = 0;
  let crossRefs = 0;
  let age = 0;
  
  try {
    lines = countLines(wissensbasisPath);
    crossRefs = hasCrossRefs(wissensbasisPath);
    age = getFileAge(wissensbasisPath);
  } catch (e) {
    // Topic without wissensbasis.md — treat as orphan
  }
  
  return {
    name: topicName,
    lines,
    crossRefs,
    age,
    isOrphan: lines < MIN_TOPIC_LINES,
    isOutdated: age > OUTDATED_DAYS,
    wissensbasisPath
  };
}

function getTopicDirectories() {
  try {
    return readdirSync(TOPICS_DIR).filter(name => {
      const path = join(TOPICS_DIR, name);
      return statSync(path).isDirectory();
    });
  } catch {
    return [];
  }
}

function generateReport(results) {
  const now = new Date().toISOString().split('T')[0];
  const topics = results.sort((a, b) => a.lines - b.lines);
  
  const orphans = topics.filter(t => t.isOrphan);
  const outdated = topics.filter(t => t.isOutdated);
  const noCrossRefs = topics.filter(t => t.crossRefs === 0);
  
  // Calculate health for table
  const healthStatus = (topic) => {
    if (topic.lines >= 60 && topic.crossRefs > 0) return '🟢 Gut';
    if (topic.lines >= 30 && topic.crossRefs > 0) return '🟡 Mittel';
    if (topic.lines >= 30 && topic.crossRefs === 0) return '🟡 Mittel (keine Cross-Refs)';
    return '🔴 Schwach';
  };

  let report = `# Wiki Lint Report — ${now}

> Automated Health Check | Geprüft: ${topics.length} Topics

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| Themen gesamt | ${topics.length} |
| Orphans (<${MIN_TOPIC_LINES} Zeilen) | ${orphans.length} |
| Veraltet (>${OUTDATED_DAYS} Tage) | ${outdated.length} |
| Ohne Cross-Refs | ${noCrossRefs.length} |
| Mit Cross-Refs | ${topics.length - noCrossRefs.length} |

`;

  if (orphans.length > 0) {
    report += `## ⚠️ Orphan Pages\n\n`;
    report += `| Topic | Zeilen | Cross-Refs | Alter |\n`;
    report += `|-------|--------|-----------|------|\n`;
    orphans.forEach(t => {
      report += `| \`${t.name}\` | ${t.lines} | ${t.crossRefs} | ${t.age} Tage |\n`;
    });
    report += `\n`;
  } else {
    report += `## ✅ Keine Orphan Pages\n\n`;
    report += `Alle Topics haben mindestens ${MIN_TOPIC_LINES} Zeilen.\n\n`;
  }

  if (outdated.length > 0) {
    report += `## ⚠️ Veraltete Topics (>${OUTDATED_DAYS} Tage)\n\n`;
    report += `| Topic | Letztes Update |\n`;
    report += `|-------|---------------|\n`;
    outdated.forEach(t => {
      report += `| \`${t.name}\` | ${t.age} Tage |\n`;
    });
    report += `\n`;
  } else {
    report += `## ✅ Keine veraltete Info\n\n`;
    report += `Alle Topics wurden in den letzten ${OUTDATED_DAYS} Tagen aktualisiert.\n\n`;
  }

  if (noCrossRefs.length > 0) {
    report += `## ⚠️ Topics ohne Cross-References\n\n`;
    report += "Diese Topics haben keine `[[topic]]` Verlinkungen:\\n\\n";
    report += `| Topic | Cross-Refs |\n`;
    report += `|-------|-----------|\n`;
    noCrossRefs.forEach(t => {
      report += `| \`${t.name}\` | ${t.crossRefs} |\n`;
    });
    report += `\n`;
  } else {
    report += `## ✅ Alle Topics mit Cross-References\n\n`;
  }

  // Topic table
  report += `## 📊 Topic-Übersicht\n\n`;
  report += `| Topic | Zeilen | Cross-Refs | Status |\n`;
  report += `|-------|--------|-----------|--------|\n`;
  topics.forEach(t => {
    report += `| \`${t.name}\` | ${t.lines} | ${t.crossRefs} | ${healthStatus(t)} |\n`;
  });
  report += `\n`;

  // Recommended actions
  report += `## Empfohlene Actions\n\n`;
  if (orphans.length > 0) {
    report += `- 🔴 ${orphans.length} Orphan Topics erweitern (Details oben)\n`;
  }
  if (noCrossRefs.length > 0) {
    report += `- 🟠 ${noCrossRefs.length} Topics brauchen Cross-References\n`;
  }
  if (outdated.length > 0) {
    report += `- 🟡 ${outdated.length} Topics sind veraltet (>${OUTDATED_DAYS} Tage)\n`;
  }
  if (orphans.length === 0 && noCrossRefs.length === 0 && outdated.length === 0) {
    report += `- ✅ Wiki ist gesund — keine Aktion nötig\n`;
  }
  
  report += `\n---\n`;
  report += `*Wiki-Lint erzeugt: ${now} | Quelle: operations/bin/wiki-lint.js*\n`;

  return report;
}

function run() {
  console.log('🕵️ Starte Wiki-Lint...\n');
  
  const topicNames = getTopicDirectories();
  if (topicNames.length === 0) {
    log('Keine Topics gefunden!', 'error');
    process.exit(1);
  }
  
  log(`Gefunden: ${topicNames.length} Topics`);
  
  const results = topicNames.map(name => {
    const path = join(TOPICS_DIR, name);
    return lintTopic(name, path);
  });
  
  // Show warnings
  const orphans = results.filter(r => r.isOrphan);
  const noCrossRefs = results.filter(r => r.crossRefs === 0);
  
  if (orphans.length > 0) {
    log(`${orphans.length} Orphan Topics gefunden`, 'warn');
    orphans.forEach(t => log(`  - ${t.name}: ${t.lines} Zeilen`, 'warn'));
  } else {
    log('Keine Orphan Pages');
  }
  
  if (noCrossRefs.length > 0) {
    log(`${noCrossRefs.length} Topics ohne Cross-Refs`, 'warn');
  } else {
    log('Alle Topics haben Cross-References');
  }
  
  // Generate and write report
  const report = generateReport(results);
  const reportPath = join(WIKI_ROOT, 'wiki-lint-report.md');
  writeFileSync(reportPath, report, 'utf8');
  
  log(`Report geschrieben: wiki/wiki-lint-report.md`);
  
  // Exit with error code if there are problems
  if (orphans.length > 0 || noCrossRefs.length > 3) {
    process.exit(1);
  }
  
  console.log('\n✅ Wiki-Lint abgeschlossen');
}

run();