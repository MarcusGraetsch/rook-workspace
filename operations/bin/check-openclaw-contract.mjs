#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const USER_SYSTEMD_DIR = '/root/.config/systemd/user';
const REQUIRED_AGENT_IDS = ['rook', 'engineer', 'researcher', 'test', 'review'];
const REQUIRED_HOOK_PREFIX = 'hook:';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

function hasEnvAssignment(unitText, key, expectedValue) {
  const needle = `Environment=${key}=${expectedValue}`;
  return unitText.includes(needle);
}

function hasExecArg(unitText, expectedArg) {
  return unitText
    .split('\n')
    .some((line) => line.startsWith('ExecStart=') && line.includes(expectedArg));
}

async function main() {
  const checks = [];
  let ok = true;

  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const hooks = config?.hooks || {};
  const agentList = Array.isArray(config?.agents?.list) ? config.agents.list : [];
  const agentIds = new Set(agentList.map((agent) => agent?.id).filter(Boolean));

  const record = (name, pass, details) => {
    checks.push({ name, ok: pass, details });
    if (!pass) ok = false;
  };

  record('hooks.enabled', hooks.enabled === true, hooks.enabled === true ? 'enabled' : 'disabled or missing');
  record('hooks.token', typeof hooks.token === 'string' && hooks.token.length > 10, hooks.token ? 'present' : 'missing');
  record('hooks.allowRequestSessionKey', hooks.allowRequestSessionKey === true, String(hooks.allowRequestSessionKey));
  record(
    'hooks.allowedSessionKeyPrefixes',
    Array.isArray(hooks.allowedSessionKeyPrefixes) && hooks.allowedSessionKeyPrefixes.includes(REQUIRED_HOOK_PREFIX),
    JSON.stringify(hooks.allowedSessionKeyPrefixes || [])
  );

  for (const agentId of REQUIRED_AGENT_IDS) {
    record(`agent:${agentId}`, agentIds.has(agentId), agentIds.has(agentId) ? 'present' : 'missing');
  }

  const allowedHookAgents = new Set(Array.isArray(hooks.allowedAgentIds) ? hooks.allowedAgentIds : []);
  for (const agentId of REQUIRED_AGENT_IDS) {
    record(
      `hooks.allowedAgentIds:${agentId}`,
      allowedHookAgents.has(agentId),
      allowedHookAgents.has(agentId) ? 'allowed' : 'missing'
    );
  }

  const dispatcherUnitPath = path.join(USER_SYSTEMD_DIR, 'rook-dispatcher.service');
  const dashboardUnitPath = path.join(USER_SYSTEMD_DIR, 'rook-dashboard.service');
  const dispatcherUnit = await readText(dispatcherUnitPath);
  const dashboardUnit = await readText(dashboardUnitPath);

  record(
    'rook-dispatcher.service dispatch mode',
    hasEnvAssignment(dispatcherUnit, 'ROOK_DISPATCH_MODE', 'hook')
      || hasExecArg(dispatcherUnit, '--dispatch-mode hook'),
    'expected Environment=ROOK_DISPATCH_MODE=hook or ExecStart --dispatch-mode hook'
  );
  record(
    'rook-dispatcher.service hook model',
    hasEnvAssignment(dispatcherUnit, 'ROOK_HOOK_MODEL', 'minimax-portal/MiniMax-M2.5'),
    'expected Environment=ROOK_HOOK_MODEL=minimax-portal/MiniMax-M2.5'
  );
  record(
    'rook-dashboard.service present',
    dashboardUnit.includes('start-dashboard.sh'),
    'expected ExecStart to use start-dashboard.sh'
  );

  const summary = {
    checked_at: new Date().toISOString(),
    openclaw_config: OPENCLAW_CONFIG_PATH,
    systemd_dir: USER_SYSTEMD_DIR,
    ok,
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
