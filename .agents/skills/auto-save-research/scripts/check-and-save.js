#!/usr/bin/env node
/**
 * Auto-Save Research
 * Checks for uncommitted changes and commits/pushes them
 */

const { execSync } = require('child_process');
const path = require('path');

const WATCH_DIRS = [
  'research',
  'projects/digital-research',
  'wiki',
  'memory',
];

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stderr || e.stdout || '';
  }
}

function checkAndSave() {
  const workspace = '/root/.openclaw/workspace';
  
  // Check if we're in a git repo
  try {
    execSync('git rev-parse --git-dir', { cwd: workspace });
  } catch {
    console.error('Not a git repository');
    process.exit(1);
  }

  // Check status
  const status = run('git status --porcelain', workspace);
  
  if (!status.trim()) {
    console.log('Nothing to commit');
    return;
  }

  // Only care about watch dirs
  const lines = status.split('\n').filter(l => l.trim());
  const relevant = lines.filter(l => {
    const file = l.slice(3).trim();
    return WATCH_DIRS.some(dir => file.startsWith(dir));
  });

  if (!relevant.length) {
    console.log('No changes in watched directories');
    return;
  }

  // Add relevant files
  for (const line of relevant) {
    const file = line.slice(3).trim();
    run(`git add "${file}"`, workspace);
  }

  // Commit
  const timestamp = new Date().toISOString();
  const files = relevant.map(l => l.slice(3).trim().split('/').pop()).join(', ');
  const msg = `auto-save: ${files} @ ${timestamp}`;
  
  try {
    run(`git commit -m "${msg}" --quiet`, workspace);
    console.log(`Committed: ${msg}`);
  } catch (e) {
    console.error('Commit failed:', e.message);
    return;
  }

  // Push
  try {
    run('git push --quiet', workspace);
    console.log('Pushed to remote');
  } catch (e) {
    console.error('Push failed:', e.message);
  }
}

// Run
if (require.main === module) {
  checkAndSave();
}

module.exports = { checkAndSave };
