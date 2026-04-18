#!/usr/bin/env node

import { promises as fs } from 'fs';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFile = promisify(execFileCallback);

const OPENCLAW_DIR = '/root/.openclaw';
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace');
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');
const CREDENTIALS_DIR = path.join(OPENCLAW_DIR, 'credentials');
const TASKS_DIR = path.join(WORKSPACE_DIR, 'operations', 'tasks');
const CANONICAL_ARCHIVE_TASKS_DIR = path.join(WORKSPACE_DIR, 'operations', 'archive', 'tasks');
const RUNTIME_TASK_STATE_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'task-state');
const RUNTIME_ARCHIVE_TASKS_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'archive', 'tasks');
const WORKSPACE_MAIN_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace-main', 'operations', 'tasks');
const BACKUP_GLOB_ROOT = path.join(OPENCLAW_DIR, 'backup');
const REPO_SYSTEMD_DIR = path.join(WORKSPACE_DIR, 'operations', 'systemd');
const USER_SYSTEMD_DIR = '/root/.config/systemd/user';

const REQUIRED_AGENT_IDS = ['rook', 'engineer', 'researcher', 'test', 'review'];
const REQUIRED_WORKER_AGENT_IDS = ['engineer', 'researcher', 'test', 'review'];
const REQUIRED_HOOK_PREFIX = 'hook:';
const MIN_TIMEOUT_SECONDS = 180;

const UNIT_FILES = [
  'rook-dashboard.service',
  'rook-dashboard-watchdog.service',
  'rook-dashboard-watchdog.timer',
  'rook-dispatcher.service',
  'rook-dispatcher.timer',
  'rook-runtime-backup.service',
  'rook-runtime-backup.timer',
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
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

function configuredAgentIds(config) {
  return new Set(
    Array.isArray(config?.agents?.list)
      ? config.agents.list
          .map((agent) => agent?.id)
          .filter((value) => typeof value === 'string' && value.length > 0)
      : []
  );
}

function octal(mode) {
  return `0${mode.toString(8)}`;
}

function hasEnvAssignment(unitText, key, expectedValue) {
  return unitText.includes(`Environment=${key}=${expectedValue}`);
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

async function collectJsonFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const targetPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(targetPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(targetPath);
    }
  }

  return files;
}

function relativeProjectTaskMap(rootDir, files) {
  const mapping = new Map();

  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath);
    const projectId = path.dirname(relativePath);
    const taskFile = path.basename(relativePath);
    if (!mapping.has(projectId)) {
      mapping.set(projectId, new Set());
    }
    mapping.get(projectId).add(taskFile);
  }

  return mapping;
}

async function findBackupMatches(relativePath) {
  const matches = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(targetPath);
        continue;
      }
      if (entry.isFile() && targetPath.endsWith(relativePath)) {
        matches.push(targetPath);
      }
    }
  }

  if (await pathExists(BACKUP_GLOB_ROOT)) {
    await walk(BACKUP_GLOB_ROOT);
  }

  return matches.sort();
}

function classifyRuntimeOnlyFinding({ canonicalArchiveExists, runtimeArchiveExists, workspaceMainExists, backupMatches }) {
  const hasBackupMatches = Array.isArray(backupMatches) && backupMatches.length > 0;

  if (canonicalArchiveExists || runtimeArchiveExists) {
    return {
      classification: 'stale_runtime_overlay_for_archived_task',
      recommended_action: 'prune_runtime_overlay',
    };
  }

  if (workspaceMainExists) {
    return {
      classification: 'runtime_overlay_with_workspace_main_evidence',
      recommended_action: 'compare_against_workspace_main',
    };
  }

  if (hasBackupMatches) {
    return {
      classification: 'backup_only_task_evidence',
      recommended_action: 'review_for_restore_or_archive',
    };
  }

  return {
    classification: 'orphan_runtime_overlay',
    recommended_action: 'manual_investigation',
  };
}

async function trackedWorkspaceFiles() {
  const { stdout } = await execFile('git', ['-C', WORKSPACE_DIR, 'ls-files']);
  return stdout
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.join(WORKSPACE_DIR, value));
}

async function findTrackedReferences(agentId, trackedFiles) {
  const refPatterns = [
    `${OPENCLAW_DIR}/agents/${agentId}`,
    `agents/${agentId}`,
    `agent:${agentId}:`,
    `'${agentId}'`,
    `"${agentId}"`,
  ];
  const refs = [];

  for (const filePath of trackedFiles) {
    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    const matchingLineNumbers = [];
    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (refPatterns.some((pattern) => line.includes(pattern))) {
        matchingLineNumbers.push(index + 1);
      }
      if (matchingLineNumbers.length >= 3) {
        break;
      }
    }
    if (matchingLineNumbers.length > 0) {
      refs.push({
        file: path.relative(OPENCLAW_DIR, filePath),
        lines: matchingLineNumbers,
      });
    }
  }

  return refs;
}

function classifyTrackedReference(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');

  if (
    normalized === 'workspace/AGENTS.md'
    || normalized === 'workspace/TOOLS.md'
    || normalized.startsWith('workspace/operations/')
    || normalized.startsWith('workspace/tasks/')
    || normalized.startsWith('workspace/skills/')
    || normalized.startsWith('workspace/wiki/')
    || normalized.startsWith('workspace/.github/')
    || normalized.startsWith('workspace/.openclaw/')
  ) {
    return 'active';
  }

  if (
    normalized.startsWith('workspace/docs/reports/')
    || normalized.startsWith('workspace/memory/')
    || normalized.startsWith('workspace/projects/')
  ) {
    return 'historical';
  }

  return 'informational';
}

async function subdirExists(dirPath, childName) {
  try {
    const stat = await fs.stat(path.join(dirPath, childName));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function latestMtimeIso(dirPath) {
  let latest = 0;

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(currentPath, entry.name);
      const stat = await fs.stat(targetPath);
      latest = Math.max(latest, stat.mtimeMs);
      if (entry.isDirectory()) {
        await walk(targetPath);
      }
    }
  }

  try {
    await walk(dirPath);
  } catch {
    return null;
  }

  return latest > 0 ? new Date(latest).toISOString() : null;
}

async function countSessionFiles(agentDir) {
  const sessionsDir = path.join(agentDir, 'sessions');
  try {
    const entries = await fs.readdir(sessionsDir);
    return entries.filter((name) => name.endsWith('.jsonl') || name.includes('.jsonl.')).length;
  } catch {
    return 0;
  }
}

async function evaluateUnitDrift(fileName) {
  const repoPath = path.join(REPO_SYSTEMD_DIR, fileName);
  const installedPath = path.join(USER_SYSTEMD_DIR, fileName);
  const repoExists = await pathExists(repoPath);
  const installedExists = await pathExists(installedPath);

  if (!repoExists || !installedExists) {
    return {
      unit: fileName,
      severity: 'warning',
      state: 'missing',
      repo_exists: repoExists,
      installed_exists: installedExists,
      details: `${fileName}: repo_exists=${repoExists}, installed_exists=${installedExists}`,
    };
  }

  const [repoText, installedText] = await Promise.all([
    readText(repoPath),
    readText(installedPath),
  ]);

  if (repoText === installedText) {
    return {
      unit: fileName,
      severity: 'info',
      state: 'aligned',
      repo_exists: true,
      installed_exists: true,
      details: `${fileName}: aligned`,
    };
  }

  return {
    unit: fileName,
    severity: 'warning',
    state: 'drift',
    repo_exists: true,
    installed_exists: true,
    details: `${fileName}: repo copy differs from installed user unit`,
  };
}

function normalizeClaimedBy(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  if (value.startsWith('dispatcher:')) {
    const [, agentId] = value.split(':', 2);
    return agentId || null;
  }

  return value;
}

async function main() {
  const config = await readJson(OPENCLAW_CONFIG_PATH);
  const agentIds = configuredAgentIds(config);
  const agentIdList = [...agentIds].sort();
  const checks = [];
  const findings = [];

  const recordCheck = (id, label, ok, warningCount = 0, errorCount = 0) => {
    checks.push({ id, label, ok, warning_count: warningCount, error_count: errorCount });
  };

  const defaults = config?.agents?.defaults || {};
  const hooks = config?.hooks || {};
  const gateway = config?.gateway || {};
  const telegram = config?.channels?.telegram || {};
  const defaultPrimaryModel = typeof defaults?.model?.primary === 'string'
    ? defaults.model.primary
    : null;
  const allowedHookAgents = new Set(Array.isArray(hooks.allowedAgentIds) ? hooks.allowedAgentIds : []);

  if (hooks.enabled !== true) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'hooks_disabled',
      details: 'hooks.enabled is not true',
    });
  }

  if (!(typeof hooks.token === 'string' && hooks.token.length > 10)) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'hooks_token_missing',
      details: 'hooks.token is missing or too short',
    });
  }

  if (hooks.allowRequestSessionKey !== true) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'warning',
      type: 'hooks_allow_request_session_key_disabled',
      details: `hooks.allowRequestSessionKey=${String(hooks.allowRequestSessionKey)}`,
    });
  }

  if (!Array.isArray(hooks.allowedSessionKeyPrefixes) || !hooks.allowedSessionKeyPrefixes.includes(REQUIRED_HOOK_PREFIX)) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'hook_prefix_missing',
      details: `allowedSessionKeyPrefixes=${JSON.stringify(hooks.allowedSessionKeyPrefixes || [])}`,
    });
  }

  if (Number(defaults?.timeoutSeconds || 0) < MIN_TIMEOUT_SECONDS) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'timeout_too_low',
      details: `agents.defaults.timeoutSeconds=${String(defaults?.timeoutSeconds ?? 'missing')}`,
    });
  }

  if (!defaultPrimaryModel) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'default_model_missing',
      details: 'agents.defaults.model.primary missing',
    });
  }

  for (const requiredAgentId of REQUIRED_AGENT_IDS) {
    if (!agentIds.has(requiredAgentId)) {
      findings.push({
        source: 'openclaw_contract',
        severity: 'error',
        type: 'required_agent_missing',
        details: requiredAgentId,
        agent_id: requiredAgentId,
      });
    }
    if (!allowedHookAgents.has(requiredAgentId)) {
      findings.push({
        source: 'openclaw_contract',
        severity: 'warning',
        type: 'required_hook_agent_missing',
        details: requiredAgentId,
        agent_id: requiredAgentId,
      });
    }
  }

  for (const requiredWorkerAgentId of REQUIRED_WORKER_AGENT_IDS) {
    const agent = Array.isArray(config?.agents?.list)
      ? config.agents.list.find((entry) => entry?.id === requiredWorkerAgentId)
      : null;
    const actualPrimaryModel = agent?.model?.primary || null;
    if (!actualPrimaryModel) {
      findings.push({
        source: 'openclaw_contract',
        severity: 'error',
        type: 'worker_model_missing',
        details: `${requiredWorkerAgentId}: model.primary missing`,
        agent_id: requiredWorkerAgentId,
      });
      continue;
    }
    if (defaultPrimaryModel && actualPrimaryModel !== defaultPrimaryModel) {
      findings.push({
        source: 'openclaw_contract',
        severity: 'warning',
        type: 'worker_model_differs_from_default',
        details: `${requiredWorkerAgentId}: default=${defaultPrimaryModel}, actual=${actualPrimaryModel}`,
        agent_id: requiredWorkerAgentId,
      });
    }
  }

  const credentialsMode = await readMode(CREDENTIALS_DIR);
  if (credentialsMode > 0o700) {
    findings.push({
      source: 'runtime_posture',
      severity: 'error',
      type: 'credentials_dir_mode_too_open',
      details: octal(credentialsMode),
    });
  }

  const diskAgentIds = (await fs.readdir(AGENTS_DIR)).sort();
  const unboundAgentDirs = diskAgentIds.filter((agentId) => !agentIds.has(agentId));
  if (unboundAgentDirs.length > 0) {
    findings.push({
      source: 'runtime_posture',
      severity: 'warning',
      type: 'unbound_agent_dirs',
      details: unboundAgentDirs.join(', '),
      agent_ids: unboundAgentDirs,
    });
  }

  const telegramGroups = telegram?.groups && typeof telegram.groups === 'object'
    ? Object.keys(telegram.groups)
    : [];
  if (telegram.enabled === true && telegram.groupPolicy === 'allowlist' && telegramGroups.length === 0) {
    findings.push({
      source: 'runtime_posture',
      severity: 'warning',
      type: 'telegram_group_allowlist_empty',
      details: 'telegram groupPolicy=allowlist but groups=0',
    });
  }

  const discord = config?.channels?.discord || {};
  const discordAllowFrom = Array.isArray(discord?.allowFrom) ? discord.allowFrom : [];
  if (discord.enabled === true && discord.groupPolicy === 'allowlist' && discordAllowFrom.length === 0) {
    findings.push({
      source: 'runtime_posture',
      severity: 'warning',
      type: 'discord_allow_from_empty',
      details: 'discord groupPolicy=allowlist but allowFrom=0',
    });
  }

  if (gateway?.controlUi?.allowInsecureAuth === true) {
    findings.push({
      source: 'runtime_posture',
      severity: 'warning',
      type: 'gateway_insecure_auth_enabled',
      details: 'gateway.controlUi.allowInsecureAuth=true',
    });
  }

  const unitChecks = await Promise.all(UNIT_FILES.map((fileName) => evaluateUnitDrift(fileName)));
  const unitFindings = unitChecks
    .filter((entry) => entry.severity !== 'info')
    .map((entry) => ({
      source: 'user_systemd_drift',
      ...entry,
    }));
  findings.push(...unitFindings);

  const dispatcherUnitText = await readText(path.join(USER_SYSTEMD_DIR, 'rook-dispatcher.service'));
  const dispatcherHookModel = getEnvAssignment(dispatcherUnitText, 'ROOK_HOOK_MODEL');
  if (
    !(
      hasEnvAssignment(dispatcherUnitText, 'ROOK_DISPATCH_MODE', 'hook')
      || hasExecArg(dispatcherUnitText, '--dispatch-mode hook')
    )
  ) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'dispatcher_not_in_hook_mode',
      details: 'rook-dispatcher.service is not configured for hook dispatch',
    });
  }
  if (!dispatcherHookModel) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'error',
      type: 'dispatcher_hook_model_missing',
      details: 'rook-dispatcher.service missing ROOK_HOOK_MODEL',
    });
  }
  if (defaultPrimaryModel && dispatcherHookModel && dispatcherHookModel === defaultPrimaryModel) {
    findings.push({
      source: 'openclaw_contract',
      severity: 'warning',
      type: 'dispatcher_hook_model_not_provider_qualified',
      details: `defaults.model.primary=${defaultPrimaryModel}, dispatcher.ROOK_HOOK_MODEL=${dispatcherHookModel}`,
    });
  }

  const canonicalFiles = await collectJsonFiles(TASKS_DIR);
  const runtimeFiles = await collectJsonFiles(RUNTIME_TASK_STATE_DIR);
  const canonicalMap = relativeProjectTaskMap(TASKS_DIR, canonicalFiles);
  const runtimeMap = relativeProjectTaskMap(RUNTIME_TASK_STATE_DIR, runtimeFiles);
  const projectIds = new Set([...canonicalMap.keys(), ...runtimeMap.keys()]);

  for (const projectId of [...projectIds].sort()) {
    const canonical = canonicalMap.get(projectId) || new Set();
    const runtime = runtimeMap.get(projectId) || new Set();
    const missingInRuntime = [...canonical].filter((taskFile) => !runtime.has(taskFile)).sort();
    const runtimeOnly = [...runtime].filter((taskFile) => !canonical.has(taskFile)).sort();

    if (missingInRuntime.length > 0 || runtimeOnly.length > 0) {
      findings.push({
        source: 'runtime_state_coverage',
        severity: 'warning',
        type: 'runtime_state_coverage_mismatch',
        details: `${projectId}: missing_in_runtime=${missingInRuntime.length}, runtime_only=${runtimeOnly.length}`,
        project_id: projectId,
        missing_in_runtime: missingInRuntime,
        runtime_only: runtimeOnly,
      });
    }
  }

  for (const [projectId, runtimeSet] of runtimeMap.entries()) {
    const canonicalSet = canonicalMap.get(projectId) || new Set();
    for (const taskFile of [...runtimeSet].sort()) {
      if (canonicalSet.has(taskFile)) {
        continue;
      }
      const relativePath = path.join(projectId, taskFile);
      const runtimeArchivePath = path.join(RUNTIME_ARCHIVE_TASKS_DIR, relativePath);
      const canonicalArchivePath = path.join(CANONICAL_ARCHIVE_TASKS_DIR, relativePath);
      const workspaceMainPath = path.join(WORKSPACE_MAIN_TASKS_DIR, relativePath);
      const backupMatches = await findBackupMatches(path.join('operations', 'tasks', relativePath));
      const canonicalArchiveExists = await pathExists(canonicalArchivePath);
      const runtimeArchiveExists = await pathExists(runtimeArchivePath);
      const workspaceMainExists = await pathExists(workspaceMainPath);
      findings.push({
        source: 'runtime_only_task_state',
        severity: 'warning',
        type: 'runtime_only_task_state',
        details: `${projectId}/${taskFile}`,
        project_id: projectId,
        task_file: taskFile,
        runtime_path: path.join(RUNTIME_TASK_STATE_DIR, relativePath),
        canonical_archive_exists: canonicalArchiveExists,
        runtime_archive_exists: runtimeArchiveExists,
        workspace_main_exists: workspaceMainExists,
        backup_matches: backupMatches,
        ...classifyRuntimeOnlyFinding({
          canonicalArchiveExists,
          runtimeArchiveExists,
          workspaceMainExists,
          backupMatches,
        }),
      });
    }
  }

  const trackedFiles = await trackedWorkspaceFiles();
  for (const agentId of unboundAgentDirs) {
    const agentDir = path.join(AGENTS_DIR, agentId);
    const refs = await findTrackedReferences(agentId, trackedFiles);
    const classifiedRefs = refs.map((ref) => ({
      ...ref,
      classification: classifyTrackedReference(ref.file),
    }));
    const blockingRefs = classifiedRefs.filter((ref) => ref.classification === 'active');
    const hasAgentDir = await subdirExists(agentDir, 'agent');
    const hasSessionsDir = await subdirExists(agentDir, 'sessions');
    const hasSessionStore = await fileExists(path.join(agentDir, 'sessions', 'sessions.json'));
    findings.push({
      source: 'stale_agent_dirs',
      severity: 'warning',
      type: 'stale_agent_dir',
      details: `${agentId}: ${hasAgentDir || refs.length > 0 ? 'blocked' : 'ready'}`,
      agent_id: agentId,
      path: agentDir,
      has_agent_subdir: hasAgentDir,
      has_sessions_dir: hasSessionsDir,
      has_session_store: hasSessionStore,
      session_file_count: await countSessionFiles(agentDir),
      latest_activity_at: await latestMtimeIso(agentDir),
      tracked_reference_count: classifiedRefs.length,
      blocking_reference_count: blockingRefs.length,
      non_blocking_reference_count: classifiedRefs.length - blockingRefs.length,
      tracked_references: classifiedRefs.slice(0, 10),
      archive_readiness: !hasAgentDir && blockingRefs.length === 0 ? 'ready' : 'blocked',
      archive_blockers: [
        ...(hasAgentDir ? ['agent_subdir_present'] : []),
        ...(blockingRefs.length > 0 ? ['active_workspace_references'] : []),
      ],
    });
  }

  for (const taskFile of canonicalFiles.sort()) {
    let task;
    try {
      task = await readJson(taskFile);
    } catch (error) {
      findings.push({
        source: 'task_agent_bindings',
        severity: 'error',
        type: 'task_parse_failed',
        details: path.relative(OPENCLAW_DIR, taskFile),
        task_file: path.relative(OPENCLAW_DIR, taskFile),
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const taskId = typeof task?.task_id === 'string' ? task.task_id : path.basename(taskFile, '.json');
    const assignedAgent = typeof task?.assigned_agent === 'string' ? task.assigned_agent : null;
    const claimedBy = typeof task?.claimed_by === 'string' ? task.claimed_by : null;
    const normalizedClaimedBy = normalizeClaimedBy(claimedBy);

    if (assignedAgent && !agentIds.has(assignedAgent)) {
      findings.push({
        source: 'task_agent_bindings',
        severity: 'warning',
        type: 'assigned_agent_unbound',
        details: `${taskId}: ${assignedAgent}`,
        task_id: taskId,
        task_file: path.relative(OPENCLAW_DIR, taskFile),
        assigned_agent: assignedAgent,
        status: task?.status || null,
        workflow_stage: task?.workflow_stage || null,
      });
    }

    if (claimedBy && normalizedClaimedBy && !agentIds.has(normalizedClaimedBy)) {
      findings.push({
        source: 'task_agent_bindings',
        severity: 'warning',
        type: 'claimed_by_unbound',
        details: `${taskId}: ${claimedBy}`,
        task_id: taskId,
        task_file: path.relative(OPENCLAW_DIR, taskFile),
        claimed_by: claimedBy,
        normalized_claimed_by: normalizedClaimedBy,
        status: task?.status || null,
        workflow_stage: task?.workflow_stage || null,
      });
    }
  }

  recordCheck(
    'openclaw_contract',
    'OpenClaw contract',
    !findings.some((finding) => finding.source === 'openclaw_contract' && finding.severity === 'error'),
    findings.filter((finding) => finding.source === 'openclaw_contract' && finding.severity === 'warning').length,
    findings.filter((finding) => finding.source === 'openclaw_contract' && finding.severity === 'error').length
  );
  recordCheck(
    'runtime_posture',
    'Runtime posture',
    !findings.some((finding) => finding.source === 'runtime_posture' && finding.severity === 'error'),
    findings.filter((finding) => finding.source === 'runtime_posture' && finding.severity === 'warning').length,
    findings.filter((finding) => finding.source === 'runtime_posture' && finding.severity === 'error').length
  );
  recordCheck(
    'runtime_state_coverage',
    'Runtime state coverage',
    true,
    findings.filter((finding) => finding.source === 'runtime_state_coverage' && finding.severity === 'warning').length,
    0
  );
  recordCheck(
    'runtime_only_task_state',
    'Runtime-only task state',
    true,
    findings.filter((finding) => finding.source === 'runtime_only_task_state' && finding.severity === 'warning').length,
    0
  );
  recordCheck(
    'stale_agent_dirs',
    'Stale agent dirs',
    true,
    findings.filter((finding) => finding.source === 'stale_agent_dirs' && finding.severity === 'warning').length,
    0
  );
  recordCheck(
    'task_agent_bindings',
    'Task agent bindings',
    !findings.some((finding) => finding.source === 'task_agent_bindings' && finding.severity === 'error'),
    findings.filter((finding) => finding.source === 'task_agent_bindings' && finding.severity === 'warning').length,
    findings.filter((finding) => finding.source === 'task_agent_bindings' && finding.severity === 'error').length
  );
  recordCheck(
    'user_systemd_drift',
    'User systemd drift',
    !unitFindings.some((finding) => finding.severity === 'error'),
    unitFindings.filter((finding) => finding.severity === 'warning').length,
    unitFindings.filter((finding) => finding.severity === 'error').length
  );

  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;
  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const summary = {
    checked_at: new Date().toISOString(),
    workspace_dir: WORKSPACE_DIR,
    openclaw_config: OPENCLAW_CONFIG_PATH,
    configured_agent_count: agentIdList.length,
    configured_agent_ids: agentIdList,
    user_systemd_dir: USER_SYSTEMD_DIR,
    ok: errorCount === 0,
    warning_count: warningCount,
    error_count: errorCount,
    checks,
    unit_alignment: unitChecks,
    findings,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
