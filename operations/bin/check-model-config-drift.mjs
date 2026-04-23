#!/usr/bin/env node

import { promises as fs, writeFileSync } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');
const PROVIDER_ALIASES = new Map([
  ['kimi-coding', ['kimi-coding', 'kimi']],
  ['kimi', ['kimi', 'kimi-coding']],
  ['openai-codex', ['openai-codex', 'codex']],
  ['codex', ['codex', 'openai-codex']],
]);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function collectConfiguredModelRefs(config, agentId) {
  const requiredRefs = new Set();
  const optionalRefs = new Set();
  const defaults = config?.agents?.defaults || {};
  const agents = Array.isArray(config?.agents?.list) ? config.agents.list : [];
  const agent = agents.find((entry) => entry?.id === agentId) || null;

  const addRef = (target, value) => {
    if (typeof value === 'string' && value.includes('/')) {
      target.add(value);
    }
  };

  addRef(requiredRefs, defaults?.model?.primary);
  addRef(requiredRefs, typeof agent?.model === 'string' ? agent.model : agent?.model?.primary);

  for (const key of Object.keys(defaults?.models || {})) {
    addRef(optionalRefs, key);
  }

  return {
    required: [...requiredRefs].sort(),
    optional: [...optionalRefs].filter((ref) => !requiredRefs.has(ref)).sort(),
  };
}

function summarizeProviderAuth(authProfiles, providerName) {
  const profiles = authProfiles?.profiles || {};
  const matches = Object.entries(profiles)
    .filter(([, value]) => value?.provider === providerName)
    .map(([key, value]) => ({
      profile: key,
      type: value?.type || value?.mode || 'unknown',
    }));
  return matches;
}

function modelIdSet(providerConfig) {
  return new Set(
    Array.isArray(providerConfig?.models)
      ? providerConfig.models
        .map((model) => model?.id)
        .filter((value) => typeof value === 'string' && value.length > 0)
      : []
  );
}

function providerCandidates(providerName) {
  return PROVIDER_ALIASES.get(providerName) || [providerName];
}

function normalizeProviderName(providerName, providers, modelId = null) {
  const candidates = providerCandidates(providerName).filter((candidate) => providers?.[candidate]);
  if (candidates.length === 0) {
    return providerName;
  }

  if (modelId) {
    const withModel = candidates.find((candidate) => modelIdSet(providers?.[candidate]).has(modelId));
    if (withModel) {
      return withModel;
    }
  }

  const withDeclaredModels = candidates.find((candidate) => (providers?.[candidate]?.models || []).length > 0);
  return withDeclaredModels || candidates[0];
}

function collectPrimaryModelRefs(config) {
  const refs = [];
  const addRef = (scope, value) => {
    const ref = typeof value === 'string' ? value : value?.primary;
    if (typeof ref === 'string' && ref.includes('/')) {
      refs.push({ scope, ref });
    }
  };

  addRef('agents.defaults.model.primary', config?.agents?.defaults?.model);

  const agents = Array.isArray(config?.agents?.list) ? config.agents.list : [];
  for (const agent of agents) {
    if (typeof agent?.id !== 'string' || agent.id.length === 0) {
      continue;
    }
    addRef(`agents.list.${agent.id}.model.primary`, agent.model);
  }

  return refs;
}

function inspectOpenClawModelRegistry(config) {
  const providers = config?.models?.providers || {};
  const allowlist = config?.agents?.defaults?.models || {};
  const findings = [];

  for (const { scope, ref } of collectPrimaryModelRefs(config)) {
    const [providerName, modelId] = ref.split('/');
    const providerKey = normalizeProviderName(providerName, providers, modelId);
    const providerConfig = providerKey ? providers?.[providerKey] : null;

    if (!providerConfig) {
      findings.push({
        severity: 'error',
        type: 'primary_model_provider_missing',
        scope,
        provider: providerName,
        model: modelId,
        details: `${scope}=${ref} has no matching provider in ${path.relative(OPENCLAW_DIR, OPENCLAW_CONFIG_PATH)} models.providers.`,
      });
      continue;
    }

    if (!modelIdSet(providerConfig).has(modelId)) {
      findings.push({
        severity: 'error',
        type: 'primary_model_missing',
        scope,
        provider: providerKey,
        model: modelId,
        details: `${scope}=${ref} resolves to provider ${providerKey}, but model ${modelId} is not declared in ${path.relative(OPENCLAW_DIR, OPENCLAW_CONFIG_PATH)} models.providers.${providerKey}.models.`,
      });
    }

    if (!Object.hasOwn(allowlist, ref)) {
      findings.push({
        severity: 'warning',
        type: 'primary_model_not_allowlisted',
        scope,
        provider: providerName,
        model: modelId,
        details: `${scope}=${ref} is not listed in agents.defaults.models.`,
      });
    }

    const resolvedRef = `${providerKey}/${modelId}`;
    if (resolvedRef !== ref && !Object.hasOwn(allowlist, resolvedRef)) {
      findings.push({
        severity: 'warning',
        type: 'resolved_primary_model_not_allowlisted',
        scope,
        provider: providerKey,
        model: modelId,
        details: `${scope}=${ref} resolves to ${resolvedRef}, but the resolved model is not listed in agents.defaults.models.`,
      });
    }
  }

  return {
    checked_model_refs: collectPrimaryModelRefs(config),
    provider_count: Object.keys(providers).length,
    findings,
  };
}

async function inspectAgent(config, agentId) {
  const agentDir = path.join(AGENTS_DIR, agentId, 'agent');
  const modelsPath = path.join(agentDir, 'models.json');
  const authProfilesPath = path.join(agentDir, 'auth-profiles.json');
  const models = await readJsonIfExists(modelsPath);
  const authProfiles = await readJsonIfExists(authProfilesPath);
  const configuredRefs = collectConfiguredModelRefs(config, agentId);
  const providers = models?.providers || {};
  const findings = [];

  const inspectRef = (ref, severity, type) => {
    const [providerName, modelId] = ref.split('/');
    const providerKey = normalizeProviderName(providerName, providers, modelId);
    const providerConfig = providerKey ? providers?.[providerKey] : null;
    if (!providerConfig) {
      findings.push({
        severity,
        type,
        provider: providerName,
        model: modelId,
        details: `Configured model ${ref} is not present in ${path.relative(OPENCLAW_DIR, modelsPath)}.`,
      });
      return;
    }

    const knownModelIds = modelIdSet(providerConfig);
    if (!knownModelIds.has(modelId)) {
      findings.push({
        severity,
        type,
        provider: providerKey || providerName,
        model: modelId,
        details: `Configured model ${ref} is not declared under provider ${providerKey || providerName} in ${path.relative(OPENCLAW_DIR, modelsPath)}.`,
      });
    }
  };

  for (const ref of configuredRefs.required) {
    inspectRef(ref, 'error', 'required_model_missing');
  }

  for (const ref of configuredRefs.optional) {
    inspectRef(ref, 'warning', 'optional_model_missing');
  }

  const handledAuthProviders = new Set();

  for (const [providerName, providerConfig] of Object.entries(providers)) {
    const normalizedProviderName = normalizeProviderName(providerName, providers);
    handledAuthProviders.add(normalizedProviderName);
    const authMatches = summarizeProviderAuth(authProfiles, providerName);
    const aliasedAuthMatches = providerCandidates(providerName)
      .flatMap((candidate) => summarizeProviderAuth(authProfiles, candidate));
    const declaredModels = Array.isArray(providerConfig?.models) ? providerConfig.models.length : 0;
    const configuredForProvider = [...configuredRefs.required, ...configuredRefs.optional]
      .filter((ref) => providerCandidates(providerName).some((candidate) => ref.startsWith(`${candidate}/`)));

    if ((authMatches.length > 0 || aliasedAuthMatches.length > 0) && declaredModels === 0 && configuredForProvider.length === 0) {
      findings.push({
        severity: 'warning',
        type: 'auth_without_configured_models',
        provider: providerName,
        details: `Provider ${providerName} has auth configured but no declared models and no configured model refs for active agent ${agentId}.`,
      });
    }
  }

  if (authProfiles?.profiles) {
    for (const profile of Object.values(authProfiles.profiles)) {
      const providerName = profile?.provider;
      if (typeof providerName !== 'string' || handledAuthProviders.has(providerName)) {
        continue;
      }

      const normalizedProviderName = normalizeProviderName(providerName, providers);
      if (normalizedProviderName !== providerName && providers?.[normalizedProviderName]) {
        continue;
      }

      findings.push({
        severity: 'warning',
        type: 'auth_provider_without_models_entry',
        provider: providerName,
        details: `Auth profile provider ${providerName} has no matching provider entry in ${path.relative(OPENCLAW_DIR, modelsPath)} for active agent ${agentId}.`,
      });
      handledAuthProviders.add(providerName);
    }
  }

  return {
    agent_id: agentId,
    agent_dir: agentDir,
    configured_model_refs: {
      required: configuredRefs.required,
      optional: configuredRefs.optional,
    },
    findings,
  };
}

async function main() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const configuredAgents = Array.isArray(config?.agents?.list) ? config.agents.list : [];
  const configuredAgentIds = configuredAgents
    .map((agent) => agent?.id)
    .filter((value) => typeof value === 'string' && value.length > 0);

  const diskAgentIds = await fs.readdir(AGENTS_DIR);
  const unboundAgentDirs = diskAgentIds
    .filter((agentId) => !configuredAgentIds.includes(agentId))
    .sort();

  const agents = [];
  const rootModelRegistry = inspectOpenClawModelRegistry(config);
  let ok = true;
  let warningCount = 0;

  for (const finding of rootModelRegistry.findings) {
    if (finding.severity === 'error') ok = false;
    if (finding.severity === 'warning') warningCount += 1;
  }

  for (const agentId of configuredAgentIds) {
    const result = await inspectAgent(config, agentId);
    agents.push(result);
    for (const finding of result.findings) {
      if (finding.severity === 'error') ok = false;
      if (finding.severity === 'warning') warningCount += 1;
    }
  }

  const summary = {
    checked_at: new Date().toISOString(),
    openclaw_config: OPENCLAW_CONFIG_PATH,
    ok,
    warning_count: warningCount,
    configured_agent_count: configuredAgentIds.length,
    unbound_agent_dirs: unboundAgentDirs,
    root_model_registry: rootModelRegistry,
    agents,
  };

  writeFileSync(1, `${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
