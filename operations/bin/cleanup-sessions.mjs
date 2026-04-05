#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import {
  DEFAULT_OPENCLAW_DIR,
  cleanupManagedHookSessions,
  cleanupOrphanTranscriptFiles,
  handleStaleActiveEntries,
} from './session-cleanup-lib.mjs';

const ROOT_DIR = process.env.OPENCLAW_DIR || DEFAULT_OPENCLAW_DIR;
const DEFAULT_STALE_HOURS = Number(process.env.ROOK_SESSION_STALE_HOURS || '24');

function parseArgs(argv) {
  const options = {
    agents: [],
    dryRun: false,
    staleHours: DEFAULT_STALE_HOURS,
    staleMode: 'mark',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--agent') options.agents.push(String(argv[++index] || '').trim());
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--stale-hours') options.staleHours = Number(argv[++index] || String(DEFAULT_STALE_HOURS));
    else if (arg === '--remove-stale') options.staleMode = 'remove';
    else if (arg === '--mark-stale') options.staleMode = 'mark';
  }

  return options;
}

async function discoverAgents(rootDir) {
  const agentsDir = path.join(rootDir, 'agents');
  try {
    return (await fs.readdir(agentsDir)).sort();
  } catch {
    return [];
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const agents = options.agents.length > 0 ? options.agents : await discoverAgents(ROOT_DIR);
  const staleMs = Math.max(1, options.staleHours) * 60 * 60 * 1000;
  const perAgent = [];

  for (const agentId of agents) {
    const stale = await handleStaleActiveEntries({
      rootDir: ROOT_DIR,
      agentId,
      staleMs,
      dryRun: options.dryRun,
      mode: options.staleMode,
    });
    const managedHooks = await cleanupManagedHookSessions({
      rootDir: ROOT_DIR,
      agentId,
      staleMs,
      dryRun: options.dryRun,
    });
    const orphaned = await cleanupOrphanTranscriptFiles({
      rootDir: ROOT_DIR,
      agentId,
      dryRun: options.dryRun,
    });

    perAgent.push({
      agentId,
      orphaned_transcripts_deleted: orphaned.deleted.length,
      stale_entries_handled: stale.staleEntries.length,
      managed_hook_sessions_cleaned: managedHooks.cleaned.length,
      orphaned_deleted_files: orphaned.deleted.map((entry) => path.basename(entry.filePath)),
      stale_entries: stale.staleEntries.map((entry) => ({
        storeKey: entry.storeKey,
        action: entry.action,
        ageHours: Number((entry.ageMs / 3600000).toFixed(2)),
      })),
      managed_hook_sessions: managedHooks.cleaned.map((entry) => ({
        storeKey: entry.storeKey,
        rawSessionKey: entry.rawSessionKey,
        deletedFiles: entry.deletedFiles.filter((file) => file.removed).map((file) => path.basename(file.filePath)),
      })),
    });
  }

  const summary = {
    updated_at: new Date().toISOString(),
    root_dir: ROOT_DIR,
    dry_run: options.dryRun,
    stale_hours: options.staleHours,
    stale_mode: options.staleMode,
    agents: perAgent,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
