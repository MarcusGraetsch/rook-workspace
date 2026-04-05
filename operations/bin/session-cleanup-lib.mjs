import { promises as fs } from 'fs';
import path from 'path';

export const DEFAULT_OPENCLAW_DIR = '/root/.openclaw';

const ACTIVE_SESSION_STATUSES = new Set([
  'active',
  'running',
  'launching',
  'in_progress',
  'processing',
  'started',
]);

const TERMINAL_SESSION_STATUSES = new Set([
  'done',
  'completed',
  'failed',
  'error',
  'aborted',
  'stale',
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sessionStoreKey(agentId, sessionKey) {
  const trimmed = String(sessionKey || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(`agent:${agentId}:`)) {
    return trimmed;
  }
  return `agent:${agentId}:${trimmed}`;
}

export function extractRawSessionKey(agentId, storeKey) {
  const prefix = `agent:${agentId}:`;
  if (typeof storeKey !== 'string') return '';
  return storeKey.startsWith(prefix) ? storeKey.slice(prefix.length) : storeKey;
}

export function isManagedEphemeralHookSession(rawSessionKey) {
  return rawSessionKey.startsWith('hook:dispatcher:') || rawSessionKey.startsWith('hook:smoke:');
}

export function sessionsDirForAgent(rootDir, agentId) {
  return path.join(rootDir, 'agents', agentId, 'sessions');
}

export function sessionIndexPath(rootDir, agentId) {
  return path.join(sessionsDirForAgent(rootDir, agentId), 'sessions.json');
}

export async function readJsonIfExists(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function loadSessionIndex(rootDir, agentId) {
  const indexPath = sessionIndexPath(rootDir, agentId);
  const index = await readJsonIfExists(indexPath, {});
  return isObject(index) ? index : {};
}

export function referencedSessionFiles(index) {
  const referenced = new Set();
  for (const entry of Object.values(index)) {
    if (!isObject(entry)) continue;
    if (typeof entry.sessionId === 'string' && entry.sessionId.trim()) {
      referenced.add(`${entry.sessionId.trim()}.jsonl`);
    }
    if (typeof entry.sessionFile === 'string' && entry.sessionFile.trim()) {
      referenced.add(path.basename(entry.sessionFile.trim()));
    }
  }
  return referenced;
}

async function removeFileIfExists(filePath, dryRun) {
  try {
    await fs.access(filePath);
  } catch {
    return { filePath, existed: false, removed: false };
  }

  if (!dryRun) {
    await fs.unlink(filePath);
  }

  return { filePath, existed: true, removed: true };
}

async function statTimestampMs(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return null;
  }
}

export async function cleanupSessionArtifacts({
  rootDir = DEFAULT_OPENCLAW_DIR,
  agentId,
  sessionKey,
  dryRun = false,
}) {
  const indexPath = sessionIndexPath(rootDir, agentId);
  const index = await loadSessionIndex(rootDir, agentId);
  const storeKey = sessionStoreKey(agentId, sessionKey);
  const entry = isObject(index[storeKey]) ? index[storeKey] : null;

  const transcriptCandidates = new Set();
  if (entry?.sessionFile) {
    transcriptCandidates.add(path.resolve(entry.sessionFile));
  }
  if (entry?.sessionId) {
    transcriptCandidates.add(path.join(sessionsDirForAgent(rootDir, agentId), `${entry.sessionId}.jsonl`));
  }

  const deletedFiles = [];
  for (const candidate of transcriptCandidates) {
    deletedFiles.push(await removeFileIfExists(candidate, dryRun));
  }

  let removedIndexEntry = false;
  if (entry) {
    removedIndexEntry = true;
    if (!dryRun) {
      delete index[storeKey];
      await writeJson(indexPath, index);
    }
  }

  return {
    agentId,
    storeKey,
    removedIndexEntry,
    deletedFiles,
    sessionId: entry?.sessionId || null,
    sessionFile: entry?.sessionFile || null,
  };
}

export async function cleanupOrphanTranscriptFiles({
  rootDir = DEFAULT_OPENCLAW_DIR,
  agentId,
  dryRun = false,
}) {
  const dir = sessionsDirForAgent(rootDir, agentId);
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((file) => file.endsWith('.jsonl'));
  } catch {
    return { agentId, scanned: 0, deleted: [] };
  }

  const index = await loadSessionIndex(rootDir, agentId);
  const referenced = referencedSessionFiles(index);
  const deleted = [];
  for (const fileName of files) {
    if (referenced.has(fileName)) continue;
    deleted.push(await removeFileIfExists(path.join(dir, fileName), dryRun));
  }

  return { agentId, scanned: files.length, deleted };
}

function isActiveishEntry(entry) {
  const status = String(entry?.status || '').trim().toLowerCase();
  if (ACTIVE_SESSION_STATUSES.has(status)) {
    return true;
  }
  const startedAt = Number(entry?.startedAt);
  const endedAt = Number(entry?.endedAt);
  return Number.isFinite(startedAt) && !Number.isFinite(endedAt);
}

function isTerminalEntry(entry) {
  const status = String(entry?.status || '').trim().toLowerCase();
  if (TERMINAL_SESSION_STATUSES.has(status)) {
    return true;
  }
  return Number.isFinite(Number(entry?.endedAt));
}

async function entryAgeMs(rootDir, agentId, entry) {
  const candidates = [];
  if (typeof entry?.updatedAt === 'number') {
    candidates.push(entry.updatedAt);
  }
  if (Number.isFinite(Number(entry?.endedAt))) {
    candidates.push(Number(entry.endedAt));
  }
  if (Number.isFinite(Number(entry?.startedAt))) {
    candidates.push(Number(entry.startedAt));
  }
  if (typeof entry?.sessionFile === 'string' && entry.sessionFile.trim()) {
    const fileMs = await statTimestampMs(entry.sessionFile.trim());
    if (Number.isFinite(fileMs)) {
      candidates.push(fileMs);
    }
  } else if (typeof entry?.sessionId === 'string' && entry.sessionId.trim()) {
    const fileMs = await statTimestampMs(
      path.join(sessionsDirForAgent(rootDir, agentId), `${entry.sessionId.trim()}.jsonl`)
    );
    if (Number.isFinite(fileMs)) {
      candidates.push(fileMs);
    }
  }

  const lastSeenMs = candidates.reduce((max, value) => Math.max(max, value), 0);
  return lastSeenMs > 0 ? Date.now() - lastSeenMs : null;
}

export async function handleStaleActiveEntries({
  rootDir = DEFAULT_OPENCLAW_DIR,
  agentId,
  staleMs,
  dryRun = false,
  mode = 'mark',
}) {
  const indexPath = sessionIndexPath(rootDir, agentId);
  const index = await loadSessionIndex(rootDir, agentId);
  const staleEntries = [];
  let changed = false;
  const nowIso = new Date().toISOString();

  for (const [storeKey, entry] of Object.entries(index)) {
    if (!isObject(entry) || !isActiveishEntry(entry)) continue;
    const ageMs = await entryAgeMs(rootDir, agentId, entry);
    if (!Number.isFinite(ageMs) || ageMs < staleMs) continue;

    const rawSessionKey = extractRawSessionKey(agentId, storeKey);
    const reason = `Session exceeded stale threshold (${Math.round(ageMs / 3600000)}h >= ${Math.round(staleMs / 3600000)}h) without a clean terminal marker.`;
    staleEntries.push({
      storeKey,
      sessionId: entry.sessionId || null,
      sessionFile: entry.sessionFile || null,
      rawSessionKey,
      ageMs,
      action: mode,
    });

    if (dryRun) continue;

    if (mode === 'remove') {
      delete index[storeKey];
      changed = true;
      continue;
    }

    index[storeKey] = {
      ...entry,
      status: 'stale',
      abortedLastRun: true,
      cleanup: {
        ...(isObject(entry.cleanup) ? entry.cleanup : {}),
        staleDetectedAt: nowIso,
        staleReason: reason,
        previousStatus: entry.status || null,
      },
    };
    changed = true;
  }

  if (changed) {
    await writeJson(indexPath, index);
  }

  return { agentId, staleEntries };
}

export async function cleanupManagedHookSessions({
  rootDir = DEFAULT_OPENCLAW_DIR,
  agentId,
  staleMs,
  dryRun = false,
}) {
  const index = await loadSessionIndex(rootDir, agentId);
  const cleaned = [];

  for (const [storeKey, entry] of Object.entries(index)) {
    if (!isObject(entry)) continue;
    const rawSessionKey = extractRawSessionKey(agentId, storeKey);
    if (!isManagedEphemeralHookSession(rawSessionKey)) continue;

    const ageMs = await entryAgeMs(rootDir, agentId, entry);
    const removable = isTerminalEntry(entry) || (Number.isFinite(ageMs) && ageMs >= staleMs);
    if (!removable) continue;

    const result = await cleanupSessionArtifacts({
      rootDir,
      agentId,
      sessionKey: rawSessionKey,
      dryRun,
    });
    cleaned.push({
      ...result,
      rawSessionKey,
      ageMs,
    });
  }

  return { agentId, cleaned };
}
