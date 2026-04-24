#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(ROOT_DIR, 'openclaw.json');
const POLICY_PATH = path.join(ROOT_DIR, 'workspace', 'operations', 'config', 'model-mode-policy.json');
const RUNTIME_STATE_PATH = path.join(ROOT_DIR, 'runtime', 'operations', 'model-mode-state.json');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');

function usage() {
  return [
    'Usage: node model-mode-controller.mjs <status|evaluate|force-default|force-fallback>',
    '',
    'Commands:',
    '  status         Show current policy, model mode, and usage summary.',
    '  evaluate       Apply warning/switch/restore rules and persist state.',
    '  force-default  Immediately restore the default model.',
    '  force-fallback Immediately switch to the fallback model.',
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
    codex: ['codex', 'openai-codex'],
    'openai-codex': ['openai-codex', 'codex'],
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
  if (!provider || !model) {
    return null;
  }

  const candidates = providerAliases(provider).filter((candidate) => providers?.[candidate]);
  if (candidates.length === 0) {
    return `${provider}/${model}`;
  }

  const providerKey = candidates.find((candidate) => {
    const providerModels = Array.isArray(providers?.[candidate]?.models)
      ? providers[candidate].models
      : [];
    return providerModels.some((entry) => entry?.id === model);
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
      if (agent && typeof agent.model === 'object' && agent.model !== null && typeof agent.model.primary === 'string') {
        agent.model.primary = ref;
      }
    }
  }
}

function wallParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((entry) => entry.type !== 'literal')
      .map((entry) => [entry.type, Number(entry.value)])
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function wallDayIndex(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function wallToUtc(parts, timeZone) {
  let guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  for (let index = 0; index < 4; index += 1) {
    const offsetMs = zoneOffsetMs(new Date(guess), timeZone);
    const resolved = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0) - offsetMs;
    if (resolved === guess) {
      return resolved;
    }
    guess = resolved;
  }
  return guess;
}

function zoneOffsetMs(date, timeZone) {
  const parts = wallParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  return asUtc - date.getTime();
}

function startOfWindow(now, timeZone, kind) {
  const parts = wallParts(now, timeZone);
  if (kind === 'hour') {
    return wallToUtc({ ...parts, minute: 0, second: 0 }, timeZone);
  }
  if (kind === 'day') {
    return wallToUtc({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
  }

  if (kind === 'week') {
    const dayIndex = wallDayIndex(parts);
    const delta = (dayIndex + 6) % 7;
    const wall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - delta));
    return wallToUtc({
      year: wall.getUTCFullYear(),
      month: wall.getUTCMonth() + 1,
      day: wall.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    }, timeZone);
  }

  return null;
}

function nextWindowReset(now, timeZone, kind) {
  const parts = wallParts(now, timeZone);
  if (kind === 'hour') {
    const wall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour + 1, 0, 0));
    return wallToUtc({
      year: wall.getUTCFullYear(),
      month: wall.getUTCMonth() + 1,
      day: wall.getUTCDate(),
      hour: wall.getUTCHours(),
      minute: wall.getUTCMinutes(),
      second: wall.getUTCSeconds(),
    }, timeZone);
  }

  if (kind === 'day') {
    const wall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0));
    return wallToUtc({
      year: wall.getUTCFullYear(),
      month: wall.getUTCMonth() + 1,
      day: wall.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    }, timeZone);
  }

  if (kind === 'week') {
    const currentStart = new Date(startOfWindow(now, timeZone, 'week'));
    const wall = new Date(currentStart.getTime());
    wall.setUTCDate(wall.getUTCDate() + 7);
    return wallToUtc({
      year: wall.getUTCFullYear(),
      month: wall.getUTCMonth() + 1,
      day: wall.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    }, timeZone);
  }

  return null;
}

async function collectUsage(defaultModelRef, timeZone, limits, providers) {
  const windowKeys = ['hour', 'day', 'week'];
  const now = new Date();
  const starts = {
    hour: startOfWindow(now, timeZone, 'hour'),
    day: startOfWindow(now, timeZone, 'day'),
    week: startOfWindow(now, timeZone, 'week'),
  };
  const resets = {
    hour: nextWindowReset(now, timeZone, 'hour'),
    day: nextWindowReset(now, timeZone, 'day'),
    week: nextWindowReset(now, timeZone, 'week'),
  };
  const usage = {
    hour: 0,
    day: 0,
    week: 0,
  };
  const sessionsByWindow = {
    hour: [],
    day: [],
    week: [],
  };

  const agentIds = await fs.readdir(AGENTS_DIR).catch(() => []);
  for (const agentId of agentIds) {
    const sessionsIndexPath = path.join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
    const sessionsIndex = await readJson(sessionsIndexPath, null);
    if (!sessionsIndex || typeof sessionsIndex !== 'object') {
      continue;
    }

    for (const [sessionKey, record] of Object.entries(sessionsIndex)) {
      const ref = normalizeModelRef(
        `${String(record?.modelProvider || '').trim()}/${String(record?.model || '').trim()}`,
        providers
      );

      if (ref !== defaultModelRef) {
        continue;
      }

      const totalTokens = Number(record?.totalTokens || record?.inputTokens || 0);
      if (!Number.isFinite(totalTokens) || totalTokens <= 0) {
        continue;
      }

      const finishedAt = Number(record?.endedAt || record?.updatedAt || record?.startedAt || 0);
      if (!Number.isFinite(finishedAt) || finishedAt <= 0) {
        continue;
      }

      for (const key of windowKeys) {
        if (finishedAt >= starts[key]) {
          usage[key] += totalTokens;
          sessionsByWindow[key].push({
            agentId,
            sessionKey,
            totalTokens,
            finishedAt,
          });
        }
      }
    }
  }

  const result = {};
  for (const key of windowKeys) {
    const limit = Number(limits?.[`${key}_tokens`] || 0);
    result[key] = {
      tokens: usage[key],
      limit,
      ratio: limit > 0 ? usage[key] / limit : 0,
      start_at: new Date(starts[key]).toISOString(),
      reset_at: new Date(resets[key]).toISOString(),
      sessions: sessionsByWindow[key].length,
    };
  }

  return result;
}

function computeModeFromUsage(usage, policy) {
  const warningRatio = Number(policy?.thresholds?.warning_ratio ?? 0.8);
  const switchRatio = Number(policy?.thresholds?.switch_ratio ?? 0.95);
  const windows = Object.entries(usage);
  const aboveWarning = windows.filter(([, value]) => value.ratio >= warningRatio);
  const aboveSwitch = windows.filter(([, value]) => value.ratio >= switchRatio);

  const restoreAfter = aboveWarning.length > 0
    ? new Date(Math.max(...aboveWarning.map(([, value]) => Date.parse(value.reset_at)))).toISOString()
    : null;
  const switchAfter = aboveSwitch.length > 0
    ? new Date(Math.max(...aboveSwitch.map(([, value]) => Date.parse(value.reset_at)))).toISOString()
    : null;

  return {
    warningRatio,
    switchRatio,
    aboveWarning,
    aboveSwitch,
    restoreAfter,
    switchAfter,
  };
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
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, skipped: false, reason: `telegram HTTP ${response.status}: ${body}` };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function persistState(state) {
  await writeJsonAtomic(RUNTIME_STATE_PATH, state);
  return state;
}

async function applyMode(policy, openclawConfig, mode, reason, usage) {
  const effectiveModel = mode === 'fallback'
    ? policy.fallback_model
    : policy.default_model;
  setModelPrimary(openclawConfig, effectiveModel);

  await writeJsonAtomic(OPENCLAW_CONFIG_PATH, openclawConfig);

  const nowIso = new Date().toISOString();
  const state = {
    updated_at: nowIso,
    active_mode: mode,
    effective_model: effectiveModel,
    reason,
    policy_path: path.relative(ROOT_DIR, POLICY_PATH),
    usage,
  };

  await persistState(state);
  return state;
}

async function computeDecision(policy, openclawConfig, command) {
  const timeZone = String(policy?.timezone || 'Europe/Berlin');
  const providers = openclawConfig?.models?.providers || {};
  const defaultModelRef = normalizeModelRef(policy.default_model, providers);
  const fallbackModelRef = normalizeModelRef(policy.fallback_model, providers);

  if (!defaultModelRef || !fallbackModelRef) {
    throw new Error('policy default/fallback model refs could not be normalized against openclaw.json');
  }

  const usage = await collectUsage(defaultModelRef, timeZone, policy.thresholds || {}, providers);
  const thresholds = computeModeFromUsage(usage, policy);
  const runtimeState = await readJson(RUNTIME_STATE_PATH, null);
  const configuredPrimary = getModelPrimary(openclawConfig);
  const inferredMode = configuredPrimary === fallbackModelRef ? 'fallback' : 'default';
  const currentMode = command === 'force-default'
    ? 'default'
    : command === 'force-fallback'
      ? 'fallback'
      : String(runtimeState?.active_mode || inferredMode || policy.active_mode || 'default');

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
  } else if (currentMode === 'default' && thresholds.aboveSwitch.length > 0) {
    nextMode = 'fallback';
    action = 'switch';
    reason = `usage above switch threshold in ${thresholds.aboveSwitch.map(([key]) => key).join(', ')}`;
  } else if (currentMode === 'default' && thresholds.aboveWarning.length > 0) {
    action = 'warn';
    reason = `usage above warning threshold in ${thresholds.aboveWarning.map(([key]) => key).join(', ')}`;
  } else if (currentMode === 'fallback' && thresholds.aboveWarning.length === 0) {
    nextMode = 'default';
    action = 'restore';
    reason = 'usage below warning threshold after reset window';
  } else if (currentMode === 'fallback') {
    reason = 'fallback active until reset window';
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
    thresholds,
    runtime_state: runtimeState,
  };
}

async function executeDecision(policy, openclawConfig, decision) {
  const shouldWrite = decision.action !== 'hold';
  const state = decision.action === 'switch' || decision.action === 'restore'
    ? await applyMode(policy, openclawConfig, decision.next_mode, decision.reason, decision.usage)
    : await persistState({
        updated_at: new Date().toISOString(),
        active_mode: decision.current_mode,
        effective_model: decision.current_mode === 'fallback' ? policy.fallback_model : policy.default_model,
        reason: decision.reason,
        policy_path: path.relative(ROOT_DIR, POLICY_PATH),
        usage: decision.usage,
      });

  if (shouldWrite) {
    const alertSignature = [
      decision.action,
      decision.next_mode,
      decision.usage.hour.tokens,
      decision.usage.day.tokens,
      decision.usage.week.tokens,
    ].join(':');

    const text = decision.action === 'switch'
      ? [
          'limit bald erreicht!',
          `Wechsle auf Fallback-Modell: ${policy.fallback_model}`,
          `Default-Modell: ${policy.default_model}`,
          `Stundenlimit: ${decision.usage.hour.tokens}/${decision.usage.hour.limit} (${Math.round(decision.usage.hour.ratio * 100)}%)`,
          `Taglimit: ${decision.usage.day.tokens}/${decision.usage.day.limit} (${Math.round(decision.usage.day.ratio * 100)}%)`,
          `Wochenlimit: ${decision.usage.week.tokens}/${decision.usage.week.limit} (${Math.round(decision.usage.week.ratio * 100)}%)`,
          `Fallback bleibt aktiv bis mindestens ${decision.thresholds.restoreAfter || 'unknown'}`,
        ].join('\n')
      : decision.action === 'restore'
        ? [
            'Default-Modell wieder aktiv.',
            `Modell: ${policy.default_model}`,
            `Stunden-Reset: ${decision.usage.hour.reset_at}`,
            `Tages-Reset: ${decision.usage.day.reset_at}`,
            `Wochen-Reset: ${decision.usage.week.reset_at}`,
          ].join('\n')
        : [
            'limit fast erreicht!',
            `Aktives Modell: ${policy.default_model}`,
            `Stundenlimit: ${decision.usage.hour.tokens}/${decision.usage.hour.limit} (${Math.round(decision.usage.hour.ratio * 100)}%)`,
            `Taglimit: ${decision.usage.day.tokens}/${decision.usage.day.limit} (${Math.round(decision.usage.day.ratio * 100)}%)`,
            `Wochenlimit: ${decision.usage.week.tokens}/${decision.usage.week.limit} (${Math.round(decision.usage.week.ratio * 100)}%)`,
            `Fallback-Modell steht bereit: ${policy.fallback_model}`,
          ].join('\n');

    state.alert_signature = alertSignature;
    state.alert_sent_at = new Date().toISOString();
    state.telegram = await sendTelegramMessage(policy, text, openclawConfig);
    await persistState(state);
  }

  return {
    ...decision,
    state,
  };
}

async function main() {
  const command = String(process.argv[2] || 'evaluate').trim();
  if (!['status', 'evaluate', 'force-default', 'force-fallback'].includes(command)) {
    process.stderr.write(`${usage()}\n`);
    process.exit(2);
  }

  const policy = await readJson(POLICY_PATH, null);
  if (!policy) {
    throw new Error(`policy file missing: ${POLICY_PATH}`);
  }

  const openclawConfig = await readJson(OPENCLAW_CONFIG_PATH, null);
  if (!openclawConfig) {
    throw new Error(`config file missing: ${OPENCLAW_CONFIG_PATH}`);
  }

  if (command === 'status') {
    const defaultModelRef = getModelPrimary(openclawConfig);
    const runtimeState = await readJson(RUNTIME_STATE_PATH, null);
    const usage = await collectUsage(
      defaultModelRef || policy.default_model,
      String(policy.timezone || 'Europe/Berlin'),
      policy.thresholds || {},
      openclawConfig?.models?.providers || {}
    );
    const summary = await computeDecision(policy, openclawConfig, 'evaluate');
    process.stdout.write(`${JSON.stringify({
      ok: true,
      policy,
      runtime_state: runtimeState,
      config_default_model: defaultModelRef,
      usage,
      summary,
    }, null, 2)}\n`);
    return;
  }

  const decision = await computeDecision(policy, openclawConfig, command);
  const result = await executeDecision(policy, openclawConfig, decision);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
