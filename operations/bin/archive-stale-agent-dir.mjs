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
const STALE_AGENT_ARCHIVE_DIR = path.join(OPENCLAW_DIR, 'runtime', 'archive', 'stale-agents');

function parseArgs(argv) {
  const options = {
    apply: false,
    agentId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--agent') options.agentId = argv[++index] || null;
  }

  return options;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
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

async function countSessionFiles(agentDir) {
  const sessionsDir = path.join(agentDir, 'sessions');
  try {
    const entries = await fs.readdir(sessionsDir);
    return entries.filter((name) => name.endsWith('.jsonl') || name.includes('.jsonl.')).length;
  } catch {
    return 0;
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

function classifyTrackedReference(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');

  if (
    normalized === 'workspace/AGENTS.md'
    || normalized === 'workspace/TOOLS.md'
    || normalized.startsWith('workspace/operations/')
    || normalized.startsWith('workspace/tasks/')
    || normalized.startsWith('workspace/skills/')
    || normalized.startsWith('workspace/wiki/')
    || normalized.startsWith('workspace/.github/')
    || normalized.startsWith('workspace/.openclaw/')
  ) {
    return 'active';
  }

  if (
    normalized.startsWith('workspace/docs/reports/')
    || normalized.startsWith('workspace/memory/')
    || normalized.startsWith('workspace/projects/')
  ) {
    return 'historical';
  }

  return 'informational';
}

function archiveTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const configuredIds = configuredAgentIds(config);
  const trackedFiles = await trackedWorkspaceFiles();
  const diskAgentIds = (await fs.readdir(AGENTS_DIR)).sort();
  const actions = [];

  for (const agentId of diskAgentIds) {
    if (options.agentId && options.agentId !== agentId) {
      continue;
    }

    const agentDir = path.join(AGENTS_DIR, agentId);
    const isConfigured = configuredIds.has(agentId);
    const refs = (await findTrackedReferences(agentId, trackedFiles)).map((ref) => ({
      ...ref,
      classification: classifyTrackedReference(ref.file),
    }));
    const blockingRefs = refs.filter((ref) => ref.classification === 'active');
    const hasAgentDir = await subdirExists(agentDir, 'agent');
    const hasSessionsDir = await subdirExists(agentDir, 'sessions');
    const sessionFileCount = await countSessionFiles(agentDir);
    const latestActivityAt = await latestMtimeIso(agentDir);
    const proposedArchivePath = path.join(STALE_AGENT_ARCHIVE_DIR, `${agentId}-${archiveTimestamp()}`);

    const blockers = [
      ...(isConfigured ? ['agent_still_configured'] : []),
      ...(blockingRefs.length > 0 ? ['active_workspace_references'] : []),
    ];
    const fullDirArchiveReady = blockers.length === 0;

    const action = {
      action: fullDirArchiveReady ? 'archive_stale_agent_dir' : 'skip_stale_agent_dir',
      apply: options.apply,
      agent_id: agentId,
      source_path: agentDir,
      proposed_archive_path: proposedArchivePath,
      configured: isConfigured,
      has_agent_subdir: hasAgentDir,
      has_sessions_dir: hasSessionsDir,
      session_file_count: sessionFileCount,
      latest_activity_at: latestActivityAt,
      tracked_reference_count: refs.length,
      blocking_reference_count: blockingRefs.length,
      tracked_references: refs.slice(0, 10),
      full_dir_archive_readiness: fullDirArchiveReady ? 'ready' : 'blocked',
      full_dir_archive_blockers: blockers,
    };

    if (options.apply && fullDirArchiveReady) {
      if (!await pathExists(agentDir)) {
        action.action = 'skip_stale_agent_dir';
        action.full_dir_archive_readiness = 'blocked';
        action.full_dir_archive_blockers = ['agent_dir_missing'];
      } else {
        await fs.mkdir(STALE_AGENT_ARCHIVE_DIR, { recursive: true });
        await fs.rename(agentDir, proposedArchivePath);
        await writeJson(path.join(proposedArchivePath, 'ARCHIVE-METADATA.json'), {
          archived_at: new Date().toISOString(),
          agent_id: agentId,
          source_path: agentDir,
          archive_path: proposedArchivePath,
          session_file_count: sessionFileCount,
          latest_activity_at: latestActivityAt,
          tracked_reference_count: refs.length,
          blocking_reference_count: blockingRefs.length,
          tracked_references: refs.slice(0, 25),
          archived_by: 'operations/bin/archive-stale-agent-dir.mjs',
        });
        action.applied_archive_path = proposedArchivePath;
      }
    }

    actions.push(action);
  }

  const summary = {
    checked_at: new Date().toISOString(),
    apply: options.apply,
    agents_dir: AGENTS_DIR,
    stale_agent_archive_dir: STALE_AGENT_ARCHIVE_DIR,
    action_count: actions.length,
    actions,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
