#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');
const CREDENTIALS_DIR = path.join(OPENCLAW_DIR, 'credentials');

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

async function readMode(targetPath) {
  const stat = await fs.stat(targetPath);
  return stat.mode & 0o777;
}

function octal(mode) {
  return `0${mode.toString(8)}`;
}

function configuredAgentIds(config) {
  return Array.isArray(config?.agents?.list)
    ? config.agents.list
      .map((agent) => agent?.id)
      .filter((value) => typeof value === 'string' && value.length > 0)
    : [];
}

async function main() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const checks = [];
  let ok = true;
  let warningCount = 0;

  const record = (name, pass, details, severity = 'error') => {
    checks.push({ name, ok: pass, severity, details });
    if (!pass && severity === 'error') ok = false;
    if (!pass && severity === 'warning') warningCount += 1;
  };

  const agentIds = configuredAgentIds(config);
  const diskAgentIds = (await fs.readdir(AGENTS_DIR)).sort();
  const unboundAgentDirs = diskAgentIds.filter((agentId) => !agentIds.includes(agentId));
  const telegram = config?.channels?.telegram || {};
  const discord = config?.channels?.discord || {};
  const gateway = config?.gateway || {};
  const hooks = config?.hooks || {};

  record(
    'agents.unbound_dirs',
    unboundAgentDirs.length === 0,
    unboundAgentDirs.length === 0 ? 'none' : unboundAgentDirs.join(', '),
    'warning'
  );

  for (const agentId of agentIds) {
    const agentDir = path.join(AGENTS_DIR, agentId, 'agent');
    const modelsPath = path.join(agentDir, 'models.json');
    const authProfilesPath = path.join(agentDir, 'auth-profiles.json');
    record(
      `agent:${agentId}:models.json`,
      await pathExists(modelsPath),
      path.relative(OPENCLAW_DIR, modelsPath)
    );
    record(
      `agent:${agentId}:auth-profiles.json`,
      await pathExists(authProfilesPath),
      path.relative(OPENCLAW_DIR, authProfilesPath)
    );
  }

  const credentialsMode = await readMode(CREDENTIALS_DIR);
  record(
    'credentials.dir.mode',
    credentialsMode <= 0o700,
    octal(credentialsMode)
  );

  const telegramGroups = telegram?.groups && typeof telegram.groups === 'object'
    ? Object.keys(telegram.groups)
    : [];
  record(
    'channels.telegram.group_allowlist_bootstrap',
    !(telegram.enabled === true && telegram.groupPolicy === 'allowlist' && telegramGroups.length === 0),
    telegram.enabled === true
      ? `groupPolicy=${telegram.groupPolicy || 'missing'}, groups=${telegramGroups.length}`
      : 'telegram disabled',
    'warning'
  );

  const discordAllowFrom = Array.isArray(discord?.allowFrom) ? discord.allowFrom : [];
  record(
    'channels.discord.allowFrom',
    !(discord.enabled === true && discord.groupPolicy === 'allowlist' && discordAllowFrom.length === 0),
    discord.enabled === true
      ? `groupPolicy=${discord.groupPolicy || 'missing'}, allowFrom=${discordAllowFrom.length}`
      : 'discord disabled',
    'warning'
  );

  record(
    'gateway.controlUi.allowInsecureAuth',
    gateway?.controlUi?.allowInsecureAuth !== true,
    String(gateway?.controlUi?.allowInsecureAuth ?? 'missing'),
    'warning'
  );

  record(
    'hooks.allowRequestSessionKey',
    hooks.allowRequestSessionKey !== true,
    String(hooks.allowRequestSessionKey ?? 'missing'),
    'warning'
  );

  const allowedHookAgents = Array.isArray(hooks.allowedAgentIds) ? hooks.allowedAgentIds : [];
  const unknownHookAgents = allowedHookAgents.filter((agentId) => !agentIds.includes(agentId));
  record(
    'hooks.allowedAgentIds.bound',
    unknownHookAgents.length === 0,
    unknownHookAgents.length === 0 ? 'all bound' : unknownHookAgents.join(', '),
    'warning'
  );

  const summary = {
    checked_at: new Date().toISOString(),
    openclaw_config: OPENCLAW_CONFIG_PATH,
    ok,
    warning_count: warningCount,
    configured_agent_count: agentIds.length,
    unbound_agent_dirs: unboundAgentDirs,
    checks,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
