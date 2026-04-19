#!/usr/bin/env node
/**
 * write-heartbeat.mjs
 * 
 * Writes last_heartbeat timestamp to a runtime task-state file.
 * Called periodically by agent HEARTBEAT.md during active task execution.
 * 
 * Usage: node write-heartbeat.mjs <task_id> <project_id>
 * 
 * Exit silently if the task-state file doesn't exist.
 */

import { promises as fs } from 'fs';
import path from 'path';

const RUNTIME_ROOT = process.env.ROOK_RUNTIME_ROOT || '/root/.openclaw/runtime';
const RUNTIME_TASK_STATE_DIR = `${RUNTIME_ROOT}/operations/task-state`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    // Silent exit - not enough args
    process.exit(0);
  }

  const [taskId, projectId] = args;
  const filePath = path.join(RUNTIME_TASK_STATE_DIR, projectId, `${taskId}.json`);

  // Exit silently if file doesn't exist
  try {
    await fs.access(filePath);
  } catch {
    process.exit(0);
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const state = JSON.parse(content);

    const now = new Date().toISOString();

    // Update only the heartbeat and updated_at fields
    state.last_heartbeat = now;
    state.timestamps = state.timestamps || {};
    state.timestamps.updated_at = now;

    // Atomic write: write to .tmp, then rename
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await fs.rename(tmpPath, filePath);

  } catch (err) {
    // Silent exit on any error - task may be in transient state
    process.exit(0);
  }
}

main();
