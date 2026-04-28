#!/usr/bin/env node
/**
 * model-mode-controller.mjs — Kimi RPM/TPM Controller
 * 
 * Tracks usage based on Kimi's actual rate limits:
 * - RPM (Requests Per Minute) — max 200 (Tier1 $10)
 * - TPM (Tokens Per Minute) — max 2,000,000 (Tier1 $10)
 * 
 * Uses a rolling 60-second window, updated every minute via cron.
 * When RPM or TPM exceeds threshold, switches to fallback model (minimax).
 */

import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(ROOT_DIR, 'openclaw.json');
const POLICY_PATH = path.join(ROOT_DIR, 'workspace', 'operations', 'config', 'model-mode-policy.json');
const RUNTIME_STATE_PATH = path.join(ROOT_DIR, 'runtime', 'operations', 'model-mode-state.json');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');

// Kimi Tier1 limits ($10 cumulative recharge)
const KIMI_TIER1 = {
  rpm: 200,          // requests per minute
  tpm: 2_000_000,    // tokens per minute
};

const WINDOW_MS = 60_000; // 1-minute rolling window

function usage() {
  return [
    'Usage: node model-mode-controller.mjs <status|evaluate|force-default|force-fallback>',
    '',
    'Commands:',
    '  status         Show current RPM/TPM usage and limits.',
    '  evaluate       Check usage and auto-switch if thresholds exceeded.',
    '  force-default  Immediately restore default model (kimi).',
    '  force-fallback Immediately switch to fallback model (minimax).',
  ].join('\n');
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, filePath);
}

function providerAliases(providerName) {
  const aliases = {
    kimi: ['kimi', 'kimi-coding'],
    'kimi-coding': ['kimi-coding', 'kimi'],
    minimax: ['minimax', 'minimax-portal'],
    'minimax-portal': ['minimax-portal', 'minimax'],
  };
  return aliases[providerName] || [providerName];
}

function splitModelRef(ref) {
  const value = String(ref || '').trim();
  const [provider = '', model = ''] = value.split('/');
  return { provider, model };
}

function normalizeModelRef(ref, providers) {
  const { provider, model } = splitModelRef(ref);
  if (!provider || !model) return null;

  const candidates = providerAliases(provider).filter((c) => providers?.[c]);
  if (candidates.length === 0) return `${provider}/${model}`;

  const providerKey = candidates.find((c) => {
    const models = Array.isArray(providers?.[c]?.models) ? providers[c].models : [];
    return models.some((e) => e?.id === model);
  }) || candidates[0];

  return `${providerKey}/${model}`;
}

function getModelPrimary(config) {
  return typeof config?.agents?.defaults?.model?.primary === 'string'
    ? config.agents.defaults.model.primary
    : null;
}

function setModelPrimary(config, ref) {
  if (!config?.agents?.defaults?.model) {
    config.agents = config.agents || {};
    config.agents.defaults = config.agents.defaults || {};
    config.agents.defaults.model = {};
  }
  config.agents.defaults.model.primary = ref;

  if (Array.isArray(config.agents?.list)) {
    for (const agent of config.agents.list) {
      if (agent && typeof agent.model === 'object' && agent.model !== null) {
        agent.model.primary = ref;
      } else if (agent && typeof agent.model === 'string') {
        agent.model = ref;
      }
    }
  }
}

/**
 * Collect RPM and TPM from sessions in the rolling 60-second window.
 * 
 * RPM: Count unique requests (sessions) that finished within the window.
 * TPM: Sum of totalTokens from sessions that finished within the window.
 */
async function collectKimiUsage(defaultModelRef, providers) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let rpm = 0;  // requests in window
  let tpm = 0;  // tokens in window

  const sessions = [];

  const agentIds = await fs.readdir(AGENTS_DIR).catch(() => []);
  for (const agentId of agentIds) {
    const sessionsIndexPath = path.join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
    const sessionsIndex = await readJson(sessionsIndexPath, null);
    if (!sessionsIndex || typeof sessionsIndex !== 'object') continue;

    for (const [sessionKey, record] of Object.entries(sessionsIndex)) {
      const ref = normalizeModelRef(
        `${String(record?.modelProvider || '').trim()}/${String(record?.model || '').trim()}`,
        providers
      );

      // Only count Kimi sessions
      if (!ref?.startsWith('kimi')) continue;

      // Use endedAt if available and recent, otherwise skip
      const endedAt = Number(record?.endedAt || 0);
      if (!Number.isFinite(endedAt) || endedAt <= 0) continue;

      // Must have finished within the 60-second window
      if (endedAt < windowStart || endedAt > now) continue;

      const totalTokens = Number(record?.totalTokens || 0);
      if (!Number.isFinite(totalTokens) || totalTokens <= 0) continue;

      rpm += 1;
      tpm += totalTokens;
      sessions.push({ agentId, sessionKey, totalTokens, endedAt });
    }
  }

  return { rpm, tpm, sessions, windowStart, windowEnd: now };
}

async function sendTelegramMessage(policy, text, openclawConfig) {
  if (policy?.telegram?.enabled !== true) {
    return { ok: false, skipped: true, reason: 'telegram disabled' };
  }

  const botToken = openclawConfig?.channels?.telegram?.botToken;
  const chatId = policy?.telegram?.chat_id || openclawConfig?.channels?.telegram?.allowFrom?.[0];
  if (!(typeof botToken === 'string' && botToken.length > 10 && chatId)) {
    return { ok: false, skipped: true, reason: 'telegram token/chat missing' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), text, disable_web_page_preview: true }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, skipped: false, reason: `telegram HTTP ${response.status}: ${body}` };
    }
    return { ok: true, skipped: false };
  } catch (error) {
    return { ok: false, skipped: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function applyMode(policy, openclawConfig, mode, reason, usage) {
  const effectiveModel = mode === 'fallback' ? policy.fallback_model : policy.default_model;
  setModelPrimary(openclawConfig, effectiveModel);
  await writeJsonAtomic(OPENCLAW_CONFIG_PATH, openclawConfig);

  const state = {
    updated_at: new Date().toISOString(),
    active_mode: mode,
    effective_model: effectiveModel,
    reason,
    policy_path: path.relative(ROOT_DIR, POLICY_PATH),
    usage,
  };
  await writeJsonAtomic(RUNTIME_STATE_PATH, state);
  return state;
}

async function computeDecision(policy, openclawConfig, command) {
  const providers = openclawConfig?.models?.providers || {};
  const defaultModelRef = normalizeModelRef(policy.default_model, providers);
  const fallbackModelRef = normalizeModelRef(policy.fallback_model, providers);

  if (!defaultModelRef || !fallbackModelRef) {
    throw new Error('could not normalize policy model refs against openclaw.json');
  }

  // Collect Kimi usage in rolling 60-second window
  const usage = await collectKimiUsage(defaultModelRef, providers);

  // Kimi limits (Tier1)
  const rpmLimit = KIMI_TIER1.rpm;
  const tpmLimit = KIMI_TIER1.tpm;

  // Thresholds
  const warningRatio = Number(policy?.thresholds?.warning_ratio ?? 0.8);
  const switchRatio = Number(policy?.thresholds?.switch_ratio ?? 0.95);

  const rpmRatio = rpmLimit > 0 ? usage.rpm / rpmLimit : 0;
  const tpmRatio = tpmLimit > 0 ? usage.tpm / tpmLimit : 0;

  const rpmWarning = rpmRatio >= warningRatio;
  const rpmSwitch = rpmRatio >= switchRatio;
  const tpmWarning = tpmRatio >= warningRatio;
  const tpmSwitch = tpmRatio >= switchRatio;

  const runtimeState = await readJson(RUNTIME_STATE_PATH, null);
  const configuredPrimary = getModelPrimary(openclawConfig);
  const inferredMode = configuredPrimary === fallbackModelRef ? 'fallback' : 'default';
  const currentMode = command === 'force-default' ? 'default'
    : command === 'force-fallback' ? 'fallback'
    : String(runtimeState?.active_mode || inferredMode || 'default');

  let nextMode = currentMode;
  let action = 'hold';
  let reason = 'within limits';

  if (command === 'force-default') {
    nextMode = 'default';
    action = 'restore';
    reason = 'manual override';
  } else if (command === 'force-fallback') {
    nextMode = 'fallback';
    action = 'switch';
    reason = 'manual override';
  } else if (currentMode === 'default' && (rpmSwitch || tpmSwitch)) {
    nextMode = 'fallback';
    action = 'switch';
    const exceeded = [];
    if (rpmSwitch) exceeded.push(`RPM ${usage.rpm}/${rpmLimit} (${Math.round(rpmRatio * 100)}%)`);
    if (tpmSwitch) exceeded.push(`TPM ${usage.tpm}/${tpmLimit} (${Math.round(tpmRatio * 100)}%)`);
    reason = `limit exceeded: ${exceeded.join(', ')}`;
  } else if (currentMode === 'default' && (rpmWarning || tpmWarning)) {
    action = 'warn';
    const near = [];
    if (rpmWarning) near.push(`RPM ${usage.rpm}/${rpmLimit} (${Math.round(rpmRatio * 100)}%)`);
    if (tpmWarning) near.push(`TPM ${usage.tpm}/${tpmLimit} (${Math.round(tpmRatio * 100)}%)`);
    reason = `approaching limit: ${near.join(', ')}`;
  } else if (currentMode === 'fallback' && !rpmWarning && !tpmWarning) {
    nextMode = 'default';
    action = 'restore';
    reason = 'RPM and TPM back below warning threshold';
  } else if (currentMode === 'fallback') {
    reason = 'fallback held — limits still above threshold';
  }

  return {
    ok: true,
    command,
    action,
    reason,
    current_mode: currentMode,
    next_mode: nextMode,
    effective_model: currentMode === 'fallback' ? policy.fallback_model : policy.default_model,
    usage,
    limits: { rpm: rpmLimit, tpm: tpmLimit },
    ratios: { rpm: rpmRatio, tpm: tpmRatio },
    warning_ratio: warningRatio,
    switch_ratio: switchRatio,
  };
}

async function executeDecision(policy, openclawConfig, decision) {
  const state = decision.action === 'switch' || decision.action === 'restore'
    ? await applyMode(policy, openclawConfig, decision.next_mode, decision.reason, decision.usage)
    : await writeJsonAtomic(RUNTIME_STATE_PATH, {
        updated_at: new Date().toISOString(),
        active_mode: decision.current_mode,
        effective_model: decision.current_mode === 'fallback' ? policy.fallback_model : policy.default_model,
        reason: decision.reason,
        policy_path: path.relative(ROOT_DIR, POLICY_PATH),
        usage: decision.usage,
      });

  // Send Telegram alerts on state changes
  if (decision.action === 'switch' || decision.action === 'restore' || decision.action === 'warn') {
    const lines = [];
    if (decision.action === 'switch') {
      lines.push(
        '⚠️ Kimi Limit erreicht!',
        `Switch → Fallback: ${policy.fallback_model}`,
        `RPM: ${decision.usage.rpm}/${decision.limits.rpm} (${Math.round(decision.ratios.rpm * 100)}%)`,
        `TPM: ${decision.usage.tpm}/${decision.limits.tpm} (${Math.round(decision.ratios.tpm * 100)}%)`,
        `Fallback: ${policy.fallback_model}`
      );
    } else if (decision.action === 'restore') {
      lines.push(
        '✅ Kimi wieder verfügbar',
        `Switch → Default: ${policy.default_model}`,
        `RPM: ${decision.usage.rpm}/${decision.limits.rpm}`,
        `TPM: ${decision.usage.tpm}/${decision.limits.tpm}`
      );
    } else {
      lines.push(
        '🔶 Kimi Limit fast erreicht',
        `RPM: ${decision.usage.rpm}/${decision.limits.rpm} (${Math.round(decision.ratios.rpm * 100)}%)`,
        `TPM: ${decision.usage.tpm}/${decision.limits.tpm} (${Math.round(decision.ratios.tpm * 100)}%)`,
        `Warning bei ${Math.round(decision.warning_ratio * 100)}%, Switch bei ${Math.round(decision.switch_ratio * 100)}%`
      );
    }
    state.telegram = await sendTelegramMessage(policy, lines.join('\n'), openclawConfig);
    await writeJsonAtomic(RUNTIME_STATE_PATH, state);
  }

  return { ...decision, state };
}

async function main() {
  const command = String(process.argv[2] || 'evaluate').trim();
  if (!['status', 'evaluate', 'force-default', 'force-fallback'].includes(command)) {
    process.stderr.write(`${usage()}\n`);
    process.exit(2);
  }

  const policy = await readJson(POLICY_PATH, null);
  if (!policy) throw new Error(`policy file missing: ${POLICY_PATH}`);

  const openclawConfig = await readJson(OPENCLAW_CONFIG_PATH, null);
  if (!openclawConfig) throw new Error(`config file missing: ${OPENCLAW_CONFIG_PATH}`);

  if (command === 'status') {
    const defaultModelRef = getModelPrimary(openclawConfig) || normalizeModelRef(policy.default_model, openclawConfig?.models?.providers || {});
    const runtimeState = await readJson(RUNTIME_STATE_PATH, null);
    const usage = await collectKimiUsage(defaultModelRef, openclawConfig?.models?.providers || {});
    const rpmLimit = KIMI_TIER1.rpm;
    const tpmLimit = KIMI_TIER1.tpm;
    process.stdout.write(JSON.stringify({
      ok: true,
      policy,
      runtime_state: runtimeState,
      config_default_model: defaultModelRef,
      usage: {
        rpm: usage.rpm,
        tpm: usage.tpm,
        sessions_in_window: usage.sessions.length,
        window_ms: WINDOW_MS,
        window_start: new Date(usage.windowStart).toISOString(),
        window_end: new Date(usage.windowEnd).toISOString(),
      },
      limits: { rpm: rpmLimit, tpm: tpmLimit },
      ratios: {
        rpm: rpmLimit > 0 ? usage.rpm / rpmLimit : 0,
        tpm: tpmLimit > 0 ? usage.tpm / tpmLimit : 0,
      },
    }, null, 2) + '\n');
    return;
  }

  const decision = await computeDecision(policy, openclawConfig, command);
  const result = await executeDecision(policy, openclawConfig, decision);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
