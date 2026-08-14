#!/usr/bin/env node
import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY = path.resolve(HERE, '../config/adaptive-routing-policy.json');
const DEFAULT_MODEL_MODE_STATE = '/root/.openclaw/runtime/operations/model-mode-state.json';

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function findExecutable(command, envPath = process.env.PATH || '') {
  const dirs = String(envPath).split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, command);
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Continue searching PATH.
    }
  }
  return null;
}

function baseAvailability(policy) {
  return Object.fromEntries(Object.entries(policy?.backends || {}).map(([key, backend]) => [
    key,
    {
      backend: key,
      status: 'unknown',
      available: null,
      dispatcher_executable: backend?.dispatcher_executable === true,
      interaction: backend?.interaction || 'unknown',
      source: 'policy',
      reason: 'no runtime signal',
    },
  ]));
}

export function applyModelModeState(availability, state) {
  if (!state || typeof state !== 'object') return availability;

  const mode = String(state.active_mode || '').toLowerCase();
  const reason = String(state.reason || 'model-mode state');
  const effective = String(state.effective_model || '').toLowerCase();

  if (availability.kimi) {
    if (mode === 'fallback' || (effective && !effective.includes('kimi'))) {
      availability.kimi = {
        ...availability.kimi,
        status: 'degraded',
        available: false,
        source: 'model-mode-state',
        reason: `Kimi not active: ${reason}`,
      };
    } else {
      availability.kimi = {
        ...availability.kimi,
        status: 'available',
        available: true,
        source: 'model-mode-state',
        reason: `Kimi active: ${reason}`,
      };
    }
  }

  if (availability.minimax) {
    availability.minimax = {
      ...availability.minimax,
      status: 'available',
      available: true,
      source: 'model-mode-state',
      reason: mode === 'fallback' ? 'MiniMax is active fallback' : 'MiniMax configured as fallback/standby',
    };
  }

  return availability;
}

async function applyCliProbe(availability, backendKey, command, options = {}) {
  if (!availability[backendKey]) return;

  const injected = options.cliAvailability?.[backendKey];
  if (injected) {
    availability[backendKey] = {
      ...availability[backendKey],
      status: injected.status || (injected.available === false ? 'unavailable' : 'available'),
      available: injected.available ?? injected.status !== 'unavailable',
      source: injected.source || 'test/injected',
      reason: injected.reason || 'injected CLI availability',
      executable_path: injected.executable_path || null,
      auth: injected.auth || 'unknown',
    };
    return;
  }

  const executable = await findExecutable(command, options.pathEnv);
  availability[backendKey] = {
    ...availability[backendKey],
    status: executable ? 'available' : 'unavailable',
    available: Boolean(executable),
    source: 'cli-path-probe',
    reason: executable ? `${command} CLI installed; authentication not probed` : `${command} CLI not found in PATH`,
    executable_path: executable,
    auth: 'unknown',
  };
}

export async function collectBackendAvailability(policy, options = {}) {
  const availability = baseAvailability(policy);
  const state = options.modelModeState !== undefined
    ? options.modelModeState
    : await readJson(options.modelModeStatePath || DEFAULT_MODEL_MODE_STATE, null);

  applyModelModeState(availability, state);
  await applyCliProbe(availability, 'codex', 'codex', options);
  await applyCliProbe(availability, 'claude', 'claude', options);

  return {
    checked_at: options.nowIso || new Date().toISOString(),
    model_mode: state ? {
      updated_at: state.updated_at || null,
      active_mode: state.active_mode || null,
      effective_model: state.effective_model || null,
      reason: state.reason || null,
    } : null,
    backends: availability,
  };
}

function renderHuman(snapshot, policy) {
  const lines = ['Adaptive Routing — Backend Availability'];
  if (snapshot.model_mode) {
    lines.push(`Model mode: ${snapshot.model_mode.active_mode || 'unknown'} · ${snapshot.model_mode.effective_model || '-'}`);
  }
  for (const [key, item] of Object.entries(snapshot.backends || {})) {
    const label = policy.backends?.[key]?.label || key;
    lines.push(`${label}: ${item.status} · dispatcher=${item.dispatcher_executable ? 'yes' : 'no'} · ${item.reason}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const policyIndex = args.indexOf('--policy');
  const stateIndex = args.indexOf('--model-mode-state');
  const policyPath = policyIndex >= 0 ? path.resolve(args[policyIndex + 1]) : DEFAULT_POLICY;
  const statePath = stateIndex >= 0 ? path.resolve(args[stateIndex + 1]) : DEFAULT_MODEL_MODE_STATE;
  const policy = await readJson(policyPath, null);
  if (!policy) throw new Error(`policy file missing: ${policyPath}`);

  const snapshot = await collectBackendAvailability(policy, { modelModeStatePath: statePath });
  process.stdout.write(`${json ? JSON.stringify(snapshot, null, 2) : renderHuman(snapshot, policy)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`routing-availability: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
