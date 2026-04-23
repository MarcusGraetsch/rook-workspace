#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const USER_SYSTEMD_DIR = '/root/.config/systemd/user';
const REQUIRED_AGENT_IDS = ['rook', 'engineer', 'researcher', 'test', 'review', 'coach', 'health'];
const REQUIRED_WORKER_AGENT_IDS = ['engineer', 'researcher', 'test', 'review', 'coach', 'health'];
const REQUIRED_HOOK_PREFIX = 'hook:';
const MIN_TIMEOUT_SECONDS = 180;

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

function getEnvAssignment(unitText, key) {
  const prefix = `Environment=${key}=`;
  const line = unitText
    .split('\n')
    .find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

function hasExecArg(unitText, expectedArg) {
  return unitText
    .split('\n')
    .some((line) => line.startsWith('ExecStart=') && line.includes(expectedArg));
}

function splitModelId(modelId) {
  const value = String(modelId || '').trim();
  const [provider = '', model = ''] = value.split('/');
  return { provider, model };
}

// Providers allowed to differ from agents.defaults.model.primary when used as ROOK_HOOK_MODEL.
// The dispatcher intentionally uses a cheaper/faster model (e.g. minimax) for orchestration
// while worker agents use the primary model (e.g. kimi). This is expected and not a bug.
const ALLOWED_DISPATCH_ONLY_PROVIDERS = new Set(['minimax', 'minimax-portal']);

function areCompatibleHookModels(defaultPrimaryModel, dispatcherHookModel) {
  if (!defaultPrimaryModel || !dispatcherHookModel) {
    return true;
  }

  if (defaultPrimaryModel === dispatcherHookModel) {
    return true;
  }

  const defaults = splitModelId(defaultPrimaryModel);
  const dispatcher = splitModelId(dispatcherHookModel);
  const compatibleProviders = new Set(['minimax', 'minimax-portal']);

  // Same model, different minimax provider variant (e.g. minimax vs minimax-portal)
  if (
    defaults.model.length > 0
    && defaults.model === dispatcher.model
    && compatibleProviders.has(defaults.provider)
    && compatibleProviders.has(dispatcher.provider)
  ) {
    return true;
  }

  // Intentional cross-provider dispatch: dispatcher uses a dedicated orchestration model
  // while agents use a different primary model. Allowed when dispatcher provider is in the
  // known dispatch-only set.
  if (ALLOWED_DISPATCH_ONLY_PROVIDERS.has(dispatcher.provider)) {
    return true;
  }

  return false;
}

async function main() {
  const checks = [];
  let ok = true;
  let warningCount = 0;

  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const hooks = config?.hooks || {};
  const defaults = config?.agents?.defaults || {};
  const agentList = Array.isArray(config?.agents?.list) ? config.agents.list : [];
  const agentIds = new Set(agentList.map((agent) => agent?.id).filter(Boolean));
  const defaultPrimaryModel = typeof defaults?.model?.primary === 'string'
    ? defaults.model.primary
    : null;

  const record = (name, pass, details, severity = 'error') => {
    checks.push({ name, ok: pass, severity, details });
    if (!pass && severity === 'error') ok = false;
    if (!pass && severity === 'warning') warningCount += 1;
  };

  record('hooks.enabled', hooks.enabled === true, hooks.enabled === true ? 'enabled' : 'disabled or missing');
  record('hooks.token', typeof hooks.token === 'string' && hooks.token.length > 10, hooks.token ? 'present' : 'missing');
  record('hooks.allowRequestSessionKey', hooks.allowRequestSessionKey === true, String(hooks.allowRequestSessionKey));
  record(
    'hooks.allowedSessionKeyPrefixes',
    Array.isArray(hooks.allowedSessionKeyPrefixes) && hooks.allowedSessionKeyPrefixes.includes(REQUIRED_HOOK_PREFIX),
    JSON.stringify(hooks.allowedSessionKeyPrefixes || [])
  );
  record(
    'agents.defaults.timeoutSeconds',
    Number(defaults?.timeoutSeconds || 0) >= MIN_TIMEOUT_SECONDS,
    String(defaults?.timeoutSeconds ?? 'missing')
  );
  record(
    'agents.defaults.model.primary',
    typeof defaultPrimaryModel === 'string' && defaultPrimaryModel.length > 0,
    String(defaultPrimaryModel || 'missing')
  );

  for (const agentId of REQUIRED_AGENT_IDS) {
    record(`agent:${agentId}`, agentIds.has(agentId), agentIds.has(agentId) ? 'present' : 'missing');
  }

  for (const agentId of REQUIRED_WORKER_AGENT_IDS) {
    const agent = agentList.find((entry) => entry?.id === agentId);
    const actualPrimaryModel = agent?.model?.primary || null;
    record(
      `agent:${agentId}:model.primary`,
      typeof actualPrimaryModel === 'string' && actualPrimaryModel.length > 0,
      String(actualPrimaryModel || 'missing')
    );
    record(
      `agent:${agentId}:model.consistent_with_defaults`,
      !defaultPrimaryModel || actualPrimaryModel === defaultPrimaryModel,
      defaultPrimaryModel
        ? `default=${defaultPrimaryModel}, actual=${actualPrimaryModel || 'missing'}`
        : 'defaults.model.primary missing'
    );
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
  const dispatcherHookModel = getEnvAssignment(dispatcherUnit, 'ROOK_HOOK_MODEL');

  record(
    'rook-dispatcher.service dispatch mode',
    hasEnvAssignment(dispatcherUnit, 'ROOK_DISPATCH_MODE', 'hook')
      || hasExecArg(dispatcherUnit, '--dispatch-mode hook'),
    'expected Environment=ROOK_DISPATCH_MODE=hook or ExecStart --dispatch-mode hook'
  );
  record(
    'rook-dispatcher.service hook model',
    typeof dispatcherHookModel === 'string' && dispatcherHookModel.length > 0,
    String(dispatcherHookModel || 'missing')
  );
  record(
    'rook-dispatcher.service hook model drift',
    areCompatibleHookModels(defaultPrimaryModel, dispatcherHookModel),
    defaultPrimaryModel && dispatcherHookModel
      ? `defaults.model.primary=${defaultPrimaryModel}, dispatcher.ROOK_HOOK_MODEL=${dispatcherHookModel}`
      : 'skipped due to missing model value',
    'warning'
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
    warning_count: warningCount,
    defaults_model_primary: defaultPrimaryModel,
    dispatcher_hook_model: dispatcherHookModel,
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
