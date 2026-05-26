#!/usr/bin/env node

import { execFile as execFileCallback } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);

const OPENCLAW_ROOT = '/root/.openclaw';
const WORKSPACE_ROOT = path.join(OPENCLAW_ROOT, 'workspace');
const OPS_ROOT = path.join(WORKSPACE_ROOT, 'operations');
const CONFIG_PATH = path.join(OPS_ROOT, 'config', 'vm-ops-baseline-thresholds.json');
const BRIDGE_ROOT = '/root/rook-phoenix-comm';

const REPOS = [
  '/root/.openclaw/rook-agent',
  '/root/.openclaw/workspace',
  '/root/.openclaw/workspace-main',
  '/root/.hermes',
  '/root/rook-phoenix-comm',
  '/root/sync-bridge',
];

const DEFAULTS = {
  max_dirty_repos: 6,
  max_bridge_inbox_files: 300,
  max_bridge_outbox_files: 300,
  max_bridge_discussion_files: 300,
  max_bridge_response_files: 500,
  require_runtime_posture_ok: true,
  require_control_plane_ok: true,
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function runJsonScript(scriptPath) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vm-ops-'));
  const outFile = path.join(tmpDir, 'check.json');
  const escapedScript = scriptPath.replace(/'/g, `'\\''`);
  const escapedOut = outFile.replace(/'/g, `'\\''`);

  await execFile(
    'bash',
    ['-lc', `node '${escapedScript}' > '${escapedOut}'`],
    { cwd: WORKSPACE_ROOT, maxBuffer: 20 * 1024 * 1024 }
  );

  const raw = await fs.readFile(outFile, 'utf8');
  return JSON.parse(raw || '{}');
}

async function gitDirtyCount(repoPath) {
  try {
    const { stdout } = await execFile('git', ['-C', repoPath, 'status', '--porcelain'], {
      maxBuffer: 5 * 1024 * 1024,
    });
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

async function countFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        total += 1;
      } else if (entry.isDirectory()) {
        total += await countFiles(full);
      }
    }
    return total;
  } catch {
    return 0;
  }
}

function fail(results, key, actual, expected, reason) {
  results.push({ key, ok: false, actual, expected, reason });
}

function pass(results, key, actual, expected) {
  results.push({ key, ok: true, actual, expected });
}

async function main() {
  const configured = await readJson(CONFIG_PATH).catch(() => ({}));
  const cfg = { ...DEFAULTS, ...configured };

  const posture = await runJsonScript(path.join(OPS_ROOT, 'bin', 'check-runtime-posture.mjs'));
  const control = await runJsonScript(path.join(OPS_ROOT, 'bin', 'check-runtime-control-plane.mjs'));

  const dirtyPerRepo = {};
  for (const repo of REPOS) {
    dirtyPerRepo[repo] = await gitDirtyCount(repo);
  }
  const dirtyRepos = Object.values(dirtyPerRepo).filter((count) => count > 0).length;

  const bridgeCounts = {
    inbox: await countFiles(path.join(BRIDGE_ROOT, 'inbox')),
    outbox: await countFiles(path.join(BRIDGE_ROOT, 'outbox')),
    discussions: await countFiles(path.join(BRIDGE_ROOT, 'discussions')),
    responses: await countFiles(path.join(BRIDGE_ROOT, 'responses')),
  };

  const checks = [];

  if (cfg.require_runtime_posture_ok && posture?.ok !== true) {
    fail(checks, 'runtime_posture_ok', posture?.ok, true, 'runtime posture check is not ok');
  } else {
    pass(checks, 'runtime_posture_ok', posture?.ok, true);
  }

  if (cfg.require_control_plane_ok && control?.ok !== true) {
    fail(checks, 'control_plane_ok', control?.ok, true, 'control-plane check is not ok');
  } else {
    pass(checks, 'control_plane_ok', control?.ok, true);
  }

  if (dirtyRepos > cfg.max_dirty_repos) {
    fail(checks, 'dirty_repos', dirtyRepos, cfg.max_dirty_repos, 'too many repos have uncommitted changes');
  } else {
    pass(checks, 'dirty_repos', dirtyRepos, cfg.max_dirty_repos);
  }

  const bridgeThresholds = [
    ['bridge_inbox_files', bridgeCounts.inbox, cfg.max_bridge_inbox_files],
    ['bridge_outbox_files', bridgeCounts.outbox, cfg.max_bridge_outbox_files],
    ['bridge_discussion_files', bridgeCounts.discussions, cfg.max_bridge_discussion_files],
    ['bridge_response_files', bridgeCounts.responses, cfg.max_bridge_response_files],
  ];

  for (const [key, actual, expected] of bridgeThresholds) {
    if (actual > expected) {
      fail(checks, key, actual, expected, 'bridge queue exceeds threshold');
    } else {
      pass(checks, key, actual, expected);
    }
  }

  const ok = checks.every((check) => check.ok === true);
  const output = {
    checked_at: new Date().toISOString(),
    ok,
    config_path: CONFIG_PATH,
    config: cfg,
    dirty_repo_count: dirtyRepos,
    dirty_repo_details: dirtyPerRepo,
    bridge_counts: bridgeCounts,
    checks,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exit(ok ? 0 : 2);
}

main().catch((error) => {
  const output = {
    checked_at: new Date().toISOString(),
    ok: false,
    fatal: String(error?.message || error),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exit(2);
});
