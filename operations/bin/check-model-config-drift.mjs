#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');

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
    const providerConfig = providers?.[providerName];
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
        provider: providerName,
        model: modelId,
        details: `Configured model ${ref} is not declared under provider ${providerName} in ${path.relative(OPENCLAW_DIR, modelsPath)}.`,
      });
    }
  };

  for (const ref of configuredRefs.required) {
    inspectRef(ref, 'error', 'required_model_missing');
  }

  for (const ref of configuredRefs.optional) {
    inspectRef(ref, 'warning', 'optional_model_missing');
  }

  for (const [providerName, providerConfig] of Object.entries(providers)) {
    const authMatches = summarizeProviderAuth(authProfiles, providerName);
    const declaredModels = Array.isArray(providerConfig?.models) ? providerConfig.models.length : 0;
    const configuredForProvider = [...configuredRefs.required, ...configuredRefs.optional]
      .filter((ref) => ref.startsWith(`${providerName}/`));

    if (authMatches.length > 0 && declaredModels === 0 && configuredForProvider.length === 0) {
      findings.push({
        severity: 'warning',
        type: 'auth_without_configured_models',
        provider: providerName,
        details: `Provider ${providerName} has ${authMatches.length} auth profile(s) but no declared models and no configured model refs for active agent ${agentId}.`,
      });
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
  let ok = true;
  let warningCount = 0;

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
    agents,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
