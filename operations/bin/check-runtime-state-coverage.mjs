#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_DIR = '/root/.openclaw';
const CANONICAL_TASKS_DIR = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'tasks');
const RUNTIME_TASK_STATE_DIR = path.join(OPENCLAW_DIR, 'runtime', 'operations', 'task-state');

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

async function main() {
  const canonicalFiles = await collectJsonFiles(CANONICAL_TASKS_DIR);
  const runtimeFiles = await collectJsonFiles(RUNTIME_TASK_STATE_DIR);
  const canonicalMap = relativeProjectTaskMap(CANONICAL_TASKS_DIR, canonicalFiles);
  const runtimeMap = relativeProjectTaskMap(RUNTIME_TASK_STATE_DIR, runtimeFiles);
  const projectIds = new Set([...canonicalMap.keys(), ...runtimeMap.keys()]);
  const projects = [];
  let warningCount = 0;

  for (const projectId of [...projectIds].sort()) {
    const canonical = canonicalMap.get(projectId) || new Set();
    const runtime = runtimeMap.get(projectId) || new Set();
    const missingInRuntime = [...canonical].filter((taskFile) => !runtime.has(taskFile)).sort();
    const runtimeOnly = [...runtime].filter((taskFile) => !canonical.has(taskFile)).sort();

    if (missingInRuntime.length > 0 || runtimeOnly.length > 0) {
      warningCount += 1;
    }

    projects.push({
      project_id: projectId,
      canonical_count: canonical.size,
      runtime_count: runtime.size,
      missing_in_runtime: missingInRuntime,
      runtime_only: runtimeOnly,
    });
  }

  const summary = {
    checked_at: new Date().toISOString(),
    canonical_tasks_dir: CANONICAL_TASKS_DIR,
    runtime_task_state_dir: RUNTIME_TASK_STATE_DIR,
    ok: true,
    warning_count: warningCount,
    project_count: projects.length,
    projects,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
