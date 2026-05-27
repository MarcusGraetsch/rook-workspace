#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE = path.resolve(__dirname, '../templates/sandbox-pod.yaml');
const NAMESPACE = process.env.ROOK_SANDBOX_NAMESPACE || 'platform-dev';
const IMAGE = process.env.ROOK_SANDBOX_IMAGE || 'node:22-alpine';
const DEFAULT_TIMEOUT_MS = Number(process.env.ROOK_SANDBOX_TIMEOUT_MS || 120000);

function usage() {
  console.error('Usage: run-in-sandbox.mjs --file <code-file> [--command <shell-command>] [--timeout-ms <ms>] [--keep]');
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function kubectl(args, options = {}) {
  const result = await run('kubectl', args, options);
  if (result.code !== 0 && !options.allowFailure) {
    throw new Error(`kubectl ${args.join(' ')} failed (${result.code}): ${result.stderr || result.stdout}`);
  }
  return result;
}

function parseArgs(argv) {
  const parsed = {
    file: null,
    command: 'node /workspace/input.js',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    keep: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file') {
      parsed.file = argv[++index];
    } else if (arg === '--command') {
      parsed.command = argv[++index];
    } else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[++index]);
    } else if (arg === '--keep') {
      parsed.keep = true;
    } else {
      usage();
      process.exit(2);
    }
  }

  if (!parsed.file || !Number.isInteger(parsed.timeoutMs) || parsed.timeoutMs < 1000) {
    usage();
    process.exit(2);
  }

  return parsed;
}

async function waitForPod(podName, timeoutMs) {
  await kubectl([
    '-n', NAMESPACE,
    'wait',
    '--for=condition=Ready',
    `pod/${podName}`,
    `--timeout=${Math.ceil(timeoutMs / 1000)}s`,
  ]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = `rook-sandbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'rook-sandbox-'));
  const manifestPath = path.join(tmpDir, 'sandbox-pod.yaml');

  let applied = false;
  try {
    const [template, code] = await Promise.all([
      readFile(TEMPLATE, 'utf8'),
      readFile(path.resolve(options.file), 'utf8'),
    ]);
    const manifest = template
      .replaceAll('rook-sandbox-PLACEHOLDER', runId)
      .replace('image: node:22-alpine', `image: ${IMAGE}`)
      .replaceAll('namespace: platform-dev', `namespace: ${NAMESPACE}`);

    await writeFile(manifestPath, manifest, { mode: 0o600 });
    await kubectl(['apply', '-f', manifestPath]);
    applied = true;
    await waitForPod(runId, options.timeoutMs);

    const inputPath = path.join(tmpDir, 'input.js');
    await writeFile(inputPath, code, { mode: 0o600 });
    await kubectl(['-n', NAMESPACE, 'cp', inputPath, `${runId}:/workspace/input.js`, '-c', 'runner']);

    const execResult = await kubectl([
      '-n', NAMESPACE,
      'exec',
      runId,
      '-c', 'runner',
      '--',
      'sh',
      '-lc',
      options.command,
    ], { allowFailure: true });

    const logs = await kubectl(['-n', NAMESPACE, 'logs', runId, '-c', 'runner'], { allowFailure: true });

    if (execResult.stdout) process.stdout.write(execResult.stdout);
    if (execResult.stderr) process.stderr.write(execResult.stderr);
    if (logs.stdout.trim()) {
      process.stderr.write('\n--- sandbox pod logs ---\n');
      process.stderr.write(logs.stdout);
    }

    process.exitCode = execResult.code;
  } finally {
    if (applied && !options.keep) {
      await kubectl(['delete', '-f', manifestPath, '--ignore-not-found=true'], { allowFailure: true });
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`SANDBOX_ERROR: ${error.message}`);
  process.exit(1);
});
