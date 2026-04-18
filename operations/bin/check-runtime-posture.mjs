#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');
const CREDENTIALS_DIR = path.join(OPENCLAW_DIR, 'credentials');
const RUNTIME_POSTURE_POLICY_PATH = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'config', 'runtime-posture-policy.json');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
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

function matchesConstraints(constraints, actual) {
  return Object.entries(constraints || {}).every(([key, expected]) => actual[key] === expected);
}

function resolveAcknowledgement(policy, findingType, actual) {
  const entry = policy?.acknowledged_findings?.[findingType];
  if (!entry || entry.enabled !== true) {
    return { acknowledged: false };
  }

  if (!matchesConstraints(entry.constraints || {}, actual || {})) {
    return { acknowledged: false, reason: 'policy_constraints_mismatch' };
  }

  const reviewAfter = typeof entry.review_after === 'string' ? entry.review_after : null;
  if (reviewAfter) {
    const reviewTimestamp = Date.parse(`${reviewAfter}T00:00:00Z`);
    if (Number.isFinite(reviewTimestamp) && Date.now() > reviewTimestamp) {
      return { acknowledged: false, reason: 'policy_review_expired' };
    }
  }

  return {
    acknowledged: true,
    reason: typeof entry.reason === 'string' ? entry.reason : '',
    review_after: reviewAfter,
  };
}

async function main() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const runtimePolicy = await readOptionalJson(RUNTIME_POSTURE_POLICY_PATH);
  const checks = [];
  let ok = true;
  let warningCount = 0;
  let infoCount = 0;

  const record = (name, pass, details, severity = 'error', extras = {}) => {
    checks.push({ name, ok: pass, severity, details });
    if (!pass && severity === 'error') ok = false;
    if (!pass && severity === 'warning') warningCount += 1;
    if (!pass && severity === 'info') infoCount += 1;
    if (Object.keys(extras).length > 0) {
      checks[checks.length - 1] = { ...checks[checks.length - 1], ...extras };
    }
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
  const telegramAcknowledgement = resolveAcknowledgement(
    runtimePolicy,
    'telegram_group_allowlist_empty',
    {
      telegram_enabled: telegram.enabled === true,
      telegram_group_policy: telegram.groupPolicy || null,
      telegram_groups_count: telegramGroups.length,
    }
  );
  record(
    'channels.telegram.group_allowlist_bootstrap',
    !(telegram.enabled === true && telegram.groupPolicy === 'allowlist' && telegramGroups.length === 0),
    telegram.enabled === true
      ? `groupPolicy=${telegram.groupPolicy || 'missing'}, groups=${telegramGroups.length}`
      : 'telegram disabled',
    telegramAcknowledgement.acknowledged ? 'info' : 'warning',
    telegramAcknowledgement.acknowledged
      ? {
          acknowledged: true,
          acknowledgment_reason: telegramAcknowledgement.reason,
          review_after: telegramAcknowledgement.review_after,
        }
      : {}
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

  const gatewayAcknowledgement = resolveAcknowledgement(
    runtimePolicy,
    'gateway_insecure_auth_enabled',
    {
      gateway_bind: gateway?.bind || null,
      gateway_auth_mode: gateway?.auth?.mode || null,
      gateway_allow_insecure_auth: gateway?.controlUi?.allowInsecureAuth === true,
    }
  );
  record(
    'gateway.controlUi.allowInsecureAuth',
    gateway?.controlUi?.allowInsecureAuth !== true,
    String(gateway?.controlUi?.allowInsecureAuth ?? 'missing'),
    gatewayAcknowledgement.acknowledged ? 'info' : 'warning',
    gatewayAcknowledgement.acknowledged
      ? {
          acknowledged: true,
          acknowledgment_reason: gatewayAcknowledgement.reason,
          review_after: gatewayAcknowledgement.review_after,
        }
      : {}
  );

  record(
    'hooks.allowRequestSessionKey',
    hooks.allowRequestSessionKey === true,
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
    runtime_posture_policy: RUNTIME_POSTURE_POLICY_PATH,
    ok,
    warning_count: warningCount,
    info_count: infoCount,
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
