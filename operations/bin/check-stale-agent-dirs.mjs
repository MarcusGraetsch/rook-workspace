#!/usr/bin/env node

import { promises as fs } from 'fs';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFile = promisify(execFileCallback);
const OPENCLAW_DIR = '/root/.openclaw';
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace');
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function configuredAgentIds(config) {
  return new Set(
    Array.isArray(config?.agents?.list)
      ? config.agents.list
        .map((agent) => agent?.id)
        .filter((value) => typeof value === 'string' && value.length > 0)
      : []
  );
}

async function subdirExists(dirPath, childName) {
  try {
    const stat = await fs.stat(path.join(dirPath, childName));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function latestMtimeIso(dirPath) {
  let latest = 0;

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(currentPath, entry.name);
      const stat = await fs.stat(targetPath);
      latest = Math.max(latest, stat.mtimeMs);
      if (entry.isDirectory()) {
        await walk(targetPath);
      }
    }
  }

  try {
    await walk(dirPath);
  } catch {
    return null;
  }

  return latest > 0 ? new Date(latest).toISOString() : null;
}

async function countSessionFiles(agentDir) {
  const sessionsDir = path.join(agentDir, 'sessions');
  try {
    const entries = await fs.readdir(sessionsDir);
    return entries.filter((name) => name.endsWith('.jsonl') || name.includes('.jsonl.')).length;
  } catch {
    return 0;
  }
}

async function trackedWorkspaceFiles() {
  const { stdout } = await execFile('git', ['-C', WORKSPACE_DIR, 'ls-files']);
  return stdout
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.join(WORKSPACE_DIR, value));
}

async function findTrackedReferences(agentId, trackedFiles) {
  const refPatterns = [
    `${OPENCLAW_DIR}/agents/${agentId}`,
    `agents/${agentId}`,
    `agent:${agentId}:`,
    `'${agentId}'`,
    `"${agentId}"`,
  ];
  const refs = [];

  for (const filePath of trackedFiles) {
    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    const matchingLineNumbers = [];
    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (refPatterns.some((pattern) => line.includes(pattern))) {
        matchingLineNumbers.push(index + 1);
      }
      if (matchingLineNumbers.length >= 3) {
        break;
      }
    }
    if (matchingLineNumbers.length > 0) {
      refs.push({
        file: path.relative(OPENCLAW_DIR, filePath),
        lines: matchingLineNumbers,
      });
    }
  }

  return refs;
}

async function main() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const configuredIds = configuredAgentIds(config);
  const diskAgentIds = (await fs.readdir(AGENTS_DIR)).sort();
  const staleAgentIds = diskAgentIds.filter((agentId) => !configuredIds.has(agentId));
  const trackedFiles = await trackedWorkspaceFiles();
  const agents = [];

  for (const agentId of staleAgentIds) {
    const agentDir = path.join(AGENTS_DIR, agentId);
    const refs = await findTrackedReferences(agentId, trackedFiles);
    const sessionsStorePath = path.join(agentDir, 'sessions', 'sessions.json');
    const hasAgentDir = await subdirExists(agentDir, 'agent');
    const hasSessionsDir = await subdirExists(agentDir, 'sessions');
    const latestActivity = await latestMtimeIso(agentDir);
    const sessionFileCount = await countSessionFiles(agentDir);
    const hasSessionStore = await fileExists(sessionsStorePath);
    const archiveReady = !hasAgentDir && refs.length === 0;

    agents.push({
      agent_id: agentId,
      path: agentDir,
      has_agent_subdir: hasAgentDir,
      has_sessions_dir: hasSessionsDir,
      has_session_store: hasSessionStore,
      session_file_count: sessionFileCount,
      latest_activity_at: latestActivity,
      tracked_reference_count: refs.length,
      tracked_references: refs.slice(0, 10),
      archive_readiness: archiveReady ? 'ready' : 'blocked',
      archive_blockers: [
        ...(hasAgentDir ? ['agent_subdir_present'] : []),
        ...(refs.length > 0 ? ['tracked_workspace_references'] : []),
      ],
    });
  }

  const summary = {
    checked_at: new Date().toISOString(),
    openclaw_config: OPENCLAW_CONFIG_PATH,
    agents_dir: AGENTS_DIR,
    ok: true,
    stale_agent_count: agents.length,
    agents,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
