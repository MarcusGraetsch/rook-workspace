import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { ensureDir } from './loader.mjs';

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const OPENCLAW_DIR = '/root/.openclaw';

// -----------------------------------------------------------------------
// Git / GitHub helpers
// -----------------------------------------------------------------------

export function repoTailFromTask(task) {
  return String(task.related_repo || '').split('/').at(-1) || task.project_id;
}

export function canonicalRepoPath(task) {
  const repoTail = repoTailFromTask(task);
  if (repoTail === 'rook-workspace') {
    return path.join(OPENCLAW_DIR, 'workspace');
  }
  if (repoTail === 'rook-dashboard') {
    return path.join(OPENCLAW_DIR, 'workspace', 'engineering', 'rook-dashboard');
  }
  if (repoTail === 'metrics-collector') {
    return path.join(OPENCLAW_DIR, 'workspace', 'engineering', 'metrics-collector');
  }
  if (repoTail === 'digital-research') {
    return path.join(OPENCLAW_DIR, 'workspace', 'projects', 'digital-research');
  }
  if (repoTail === 'critical-theory-digital') {
    return path.join(OPENCLAW_DIR, 'workspace', 'projects', 'critical-theory-digital');
  }
  if (repoTail === 'working-notes') {
    return path.join(OPENCLAW_DIR, 'workspace', 'projects', 'working-notes');
  }
  return null;
}

export function repoViewPath(task, executor) {
  return path.join(OPENCLAW_DIR, `workspace-${executor}`, 'workspace', 'repos', repoTailFromTask(task));
}

export async function ensureSpecialistRepoView(task, executor) {
  const repoPath = repoViewPath(task, executor);
  const canonicalPath = canonicalRepoPath(task);

  await ensureDir(path.dirname(repoPath));

  try {
    await fs.lstat(repoPath);
    return repoPath;
  } catch {
    // Create the link if the target repo exists locally.
  }

  if (!canonicalPath) {
    return repoPath;
  }

  try {
    await fs.access(canonicalPath);
  } catch {
    return repoPath;
  }

  await fs.symlink(canonicalPath, repoPath);
  return repoPath;
}

async function runGit(repoPath, args) {
  return new Promise((resolve) => {
    const child = spawn('git', ['-C', repoPath, ...args], {
      cwd: OPENCLAW_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

export async function runGh(repoPath, args) {
  return new Promise((resolve) => {
    const child = spawn('gh', args, {
      cwd: repoPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

export { runGh as _runGh }; // alias for internal reuse

async function runGitNoCapture(repoPath, args) {
  return new Promise((resolve) => {
    const child = spawn('git', ['-C', repoPath, ...args], {
      cwd: OPENCLAW_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

export async function collectTaskGitEvidence(task, executor) {
  const repoPath = await ensureSpecialistRepoView(task, executor);
  const evidence = {
    repoPath,
    exists: false,
    currentBranch: null,
    upstreamBranch: null,
    aheadCount: null,
    behindCount: null,
    taskCommits: [],
    error: null,
  };

  try {
    await fs.access(repoPath);
  } catch {
    evidence.error = `Repo view not found: ${repoPath}`;
    return evidence;
  }

  evidence.exists = true;

  const branchResult = await runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult.code !== 0) {
    evidence.error = branchResult.stderr || 'Failed to determine current branch.';
    return evidence;
  }
  evidence.currentBranch = branchResult.stdout || null;

  const upstreamResult = await runGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  if (upstreamResult.code === 0 && upstreamResult.stdout) {
    evidence.upstreamBranch = upstreamResult.stdout;
    const aheadBehindResult = await runGit(repoPath, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']);
    if (aheadBehindResult.code === 0 && aheadBehindResult.stdout) {
      const [behindRaw, aheadRaw] = aheadBehindResult.stdout.split(/\s+/);
      evidence.behindCount = Number(behindRaw || '0');
      evidence.aheadCount = Number(aheadRaw || '0');
    }
  }

  const taskCommitResult = await runGit(repoPath, [
    'log',
    '--format=%H%x09%s',
    '--grep',
    `\\[task:${task.task_id}\\]`,
    '-n',
    '10',
    task.branch,
  ]);
  if (taskCommitResult.code === 0 && taskCommitResult.stdout) {
    evidence.taskCommits = taskCommitResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sha, ...rest] = line.split('\t');
        return {
          sha,
          message: rest.join('\t').trim(),
        };
      });
  }

  return evidence;
}

export async function maybePushAndCreatePR(task, executor) {
  const result = { pushed: false, prCreated: false, error: null };

  const CODE_AGENTS = new Set(['engineer', 'review']);
  if (!CODE_AGENTS.has(executor)) {
    return result;
  }

  if (!task.related_repo || !task.branch) {
    return result;
  }

  const commits = Array.isArray(task.commits) ? task.commits : [];
  const commitRefs = Array.isArray(task.commit_refs) ? task.commit_refs : [];
  if (commits.length === 0 && commitRefs.length === 0) {
    return result;
  }

  if (task.github_pull_request?.state === 'merged') {
    return result;
  }

  const repoPath = await ensureSpecialistRepoView(task, executor);

  const branchResult = await runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult.code !== 0) {
    result.error = `Failed to determine current branch: ${branchResult.stderr}`;
    return result;
  }

  const currentBranch = branchResult.stdout?.trim();
  if (currentBranch !== task.branch) {
    result.error = `Repo on branch ${currentBranch}, expected ${task.branch}. Skipping push.`;
    return result;
  }

  const upstreamResult = await runGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  const hasUpstream = upstreamResult.code === 0 && upstreamResult.stdout?.trim();
  let aheadCount = 0;

  if (hasUpstream) {
    const aheadBehindResult = await runGit(repoPath, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']);
    if (aheadBehindResult.code === 0 && aheadBehindResult.stdout) {
      const parts = aheadBehindResult.stdout.split(/\s+/);
      aheadCount = Number(parts[1] || '0');
    }
  }

  if (!task.github_pull_request) {
    task.github_pull_request = {
      repo: task.related_repo,
      number: null,
      url: null,
      state: null,
      sync_status: 'not_requested',
      last_synced_at: null,
      last_error: null,
    };
  }

  if (!hasUpstream || aheadCount > 0) {
    const pushArgs = ['push', '--force-with-lease', '-u', 'origin', task.branch];
    const pushResult = await runGit(repoPath, pushArgs);

    if (pushResult.code !== 0) {
      result.error = `git push failed: ${pushResult.stderr}`;
      task.github_pull_request.last_error = result.error;
      return result;
    }

    result.pushed = true;
  }

  if (!task.github_pull_request?.number) {
    const prTitle = task.title || `Agent work: ${task.task_id}`;
    const prBody = task.handoff_notes || `Work completed for ${task.task_id}.`;

    const prResult = await runGh(repoPath, [
      'pr', 'create',
      '--title', prTitle,
      '--body', prBody,
      '--head', task.branch,
      '--base', 'main',
    ]);

    if (prResult.code !== 0) {
      const existingPrCheck = await runGh(repoPath, [
        'pr', 'list',
        '--head', task.branch,
        '--json', 'number,title,url,state',
        '--jq', '.[0]',
      ]);

      if (existingPrCheck.code === 0 && existingPrCheck.stdout) {
        try {
          const existingPr = JSON.parse(existingPrCheck.stdout);
          if (existingPr?.number) {
            task.github_pull_request.number = existingPr.number;
            task.github_pull_request.url = existingPr.url;
            task.github_pull_request.state = existingPr.state?.toLowerCase() || 'open';
            task.github_pull_request.sync_status = 'synced';
            task.github_pull_request.last_synced_at = new Date().toISOString();
            result.prCreated = true;
            return result;
          }
        } catch {
          // JSON parse failed, fall through to error
        }
      }

      result.error = `gh pr create failed: ${prResult.stderr}`;
      task.github_pull_request.last_error = result.error;
      return result;
    }

    const prOutput = prResult.stdout?.trim() || '';
    const prUrlMatch = prOutput.match(/https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);
    const prUrl = prUrlMatch ? prUrlMatch[0] : prOutput;
    const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
    const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : null;

    task.github_pull_request.number = prNumber;
    task.github_pull_request.url = prUrl;
    task.github_pull_request.state = 'open';
    task.github_pull_request.sync_status = 'synced';
    task.github_pull_request.last_synced_at = new Date().toISOString();
    task.github_pull_request.last_error = null;
    result.prCreated = true;
  }

  return result;
}
