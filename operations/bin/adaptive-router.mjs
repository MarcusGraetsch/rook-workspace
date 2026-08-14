#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY = path.resolve(HERE, '../config/adaptive-routing-policy.json');
const DEFAULT_LOG = '/root/.openclaw/runtime/operations/routing-decisions.jsonl';

const TASK_RULES = [
  ['architecture', /\b(architektur|architecture|designentscheidung|trade[- ]?off|zielarchitektur|systemdesign)\b/i],
  ['debugging', /\b(debug|bug|fehler|stacktrace|exception|root cause|ursache|kaputt|failing)\b/i],
  ['operations', /\b(kubernetes|k8s|deployment|server|vm|systemd|docker|helm|terraform|ansible|gitlab|pipeline|ci\/?cd|betrieb|ops)\b/i],
  ['review', /\b(review|prüf|audit|gegenlesen|bewerte|bewertung|kritik|code review)\b/i],
  ['coding', /\b(implement|programmier|code|feature|refactor|repository|repo|pull request|\bpr\b|test[s]? schreiben)\b/i],
  ['research', /\b(recherch|research|suche.*quellen|vergleich|marktanalyse|finde.*information|deep research)\b/i],
  ['writing', /\b(schreib|formuliere|text|artikel|memo|konzeptpapier|dokument)\b/i],
  ['summarization', /\b(zusammenfass|summary|kurzfassung|tl;dr)\b/i],
];

const HIGH_RISK = /\b(produktiv|production|prod\b|löschen|delete|drop\b|migration|datenbank|firewall|iam|security|sicherheit|backup|restore|deploy|release|kundenumgebung)\b/i;
const LOW_RISK = /\b(entwurf|draft|idee|brainstorm|zusammenfassung|nur lesen|read[- ]?only|analyse ohne änderung)\b/i;
const COMPLEX = /\b(komplex(?:e|en|er|es|em)?|mehrere repos|multi[- ]?repo|architektur|unklare ursache|grundsatz|strategisch|langfristig|multi[- ]?agent)\b/i;
const SIMPLE = /\b(kurz|einfach|klein|typo|formatier|umbenenn|boilerplate|commit message)\b/i;

function parseEuro(text) {
  const patterns = [
    /(?:max(?:imal)?|höchstens|bis zu|budget)\s*(?:von|:)?\s*€?\s*(\d+(?:[.,]\d+)?)/i,
    /(?:nicht mehr als)\s*€?\s*(\d+(?:[.,]\d+)?)/i,
    /€\s*(\d+(?:[.,]\d+)?)\s*(?:budget|max)?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1].replace(',', '.'));
  }
  return null;
}

function explicitBackend(text) {
  const entries = [
    ['codex', /\b(codex|openai)\b/i],
    ['claude', /\b(claude|anthropic)\b/i],
    ['kimi', /\bkimi\b/i],
    ['minimax', /\bminimax\b/i],
  ];
  for (const [key, re] of entries) if (re.test(text)) return key;
  return null;
}

export function classifyTask(text) {
  const source = String(text || '').trim();
  let taskType = 'conversation';
  for (const [type, re] of TASK_RULES) {
    if (re.test(source)) { taskType = type; break; }
  }

  let risk = 'medium';
  if (HIGH_RISK.test(source)) risk = 'high';
  else if (LOW_RISK.test(source)) risk = 'low';

  let complexity = 'standard';
  if (COMPLEX.test(source) || source.length > 1200) complexity = 'complex';
  else if (SIMPLE.test(source) || source.length < 100) complexity = 'simple';

  let quality = 'normal';
  if (/\b(sehr wichtig|gründlich|hochwertig|bestmöglich|sorgfältig|prüf.*ordentlich)\b/i.test(source)) quality = 'high';
  else if (/\b(schnell|grob|rough|erstmal|vorläufig)\b/i.test(source)) quality = 'economy';

  let latency = 'normal';
  if (/\b(sofort|schnell|eilig|dringend)\b/i.test(source)) latency = 'fast';
  else if (/\b(kann dauern|keine eile|gründlich statt schnell)\b/i.test(source)) latency = 'relaxed';

  const maxExtraCostEur = parseEuro(source);
  const forcedBackend = explicitBackend(source);
  const allowPayg = /\b(api[- ]?kosten erlaubt|payg erlaubt|zusätzliche kosten erlaubt|darf extra kosten)\b/i.test(source);

  return {
    task_type: taskType,
    risk,
    complexity,
    quality,
    latency,
    max_extra_cost_eur: maxExtraCostEur,
    forced_backend: forcedBackend,
    allow_payg: allowPayg,
  };
}

function workflowFor(profile) {
  if (profile.task_type === 'research') return 'research';
  if (profile.task_type === 'architecture') return 'architecture';
  if (profile.task_type === 'operations') return 'operations';
  if (['coding', 'debugging'].includes(profile.task_type)) {
    return profile.risk === 'high' || profile.complexity === 'complex' ? 'code-high-risk' : 'code-standard';
  }
  return 'direct';
}

function scoreBackend(key, backend, profile, policy) {
  const prefs = policy.task_preferences?.[profile.task_type] || [];
  const prefIndex = prefs.indexOf(key);
  let score = Number(backend.base_priority || 0);
  const reasons = [];

  if (prefIndex >= 0) {
    score += Math.max(0, 30 - prefIndex * 7);
    reasons.push(`#${prefIndex + 1} preference for ${profile.task_type}`);
  } else {
    score -= 20;
  }

  const caps = new Set(backend.capabilities || []);
  const required = {
    coding: ['coding', 'repo'],
    debugging: ['debugging', 'repo'],
    review: ['review'],
    architecture: ['architecture'],
    operations: ['shell'],
    research: ['research'],
    writing: ['writing'],
    summarization: ['summarization'],
    conversation: ['general'],
  }[profile.task_type] || ['general'];

  for (const cap of required) {
    if (caps.has(cap)) score += 10;
    else score -= 18;
  }

  if (backend.marginal_cost_class === 'included' && policy.principles?.subscription_first) {
    score += 18;
    reasons.push('included subscription/quota');
  }

  if (profile.complexity === 'complex') {
    if (key === 'claude' || key === 'codex') score += 12;
    if (key === 'kimi' || key === 'minimax') score -= 4;
  }

  if (profile.quality === 'high') {
    if (key === 'claude' || key === 'codex') score += 10;
  }

  if (profile.latency === 'fast') {
    if (key === 'kimi' || key === 'minimax') score += 6;
  }

  if (profile.task_type === 'review' && key === 'claude') score += 8;
  if (profile.task_type === 'coding' && key === 'codex') score += 8;
  if (profile.task_type === 'debugging' && key === 'codex') score += 8;
  if (profile.task_type === 'architecture' && key === 'claude') score += 10;

  return { key, score, reasons };
}

export function routeTask(text, policy) {
  const profile = classifyTask(text);
  const backends = policy.backends || {};

  if (profile.forced_backend && backends[profile.forced_backend] && policy.principles?.explicit_user_choice_wins) {
    return {
      version: 1,
      mode: policy.mode || 'advisory',
      profile,
      workflow: workflowFor(profile),
      recommended_backend: profile.forced_backend,
      alternatives: [],
      reason: 'explicit user choice',
      extra_cost_policy: {
        allowed: profile.allow_payg || policy.principles?.allow_payg_by_default === true,
        max_eur: profile.max_extra_cost_eur ?? policy.defaults?.max_extra_cost_eur ?? 0,
      },
    };
  }

  const ranked = Object.entries(backends)
    .map(([key, backend]) => scoreBackend(key, backend, profile, policy))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const workflow = workflowFor(profile);
  const needsIndependentReview = profile.risk === 'high' || profile.quality === 'high' || profile.complexity === 'complex';
  const reviewer = needsIndependentReview
    ? ranked.find((item) => item.key !== best?.key && ['claude', 'codex'].includes(item.key))?.key || null
    : null;

  return {
    version: 1,
    mode: policy.mode || 'advisory',
    profile,
    workflow,
    recommended_backend: best?.key || null,
    reviewer,
    alternatives: ranked.slice(1, 3).map(({ key, score }) => ({ key, score })),
    score: best?.score ?? null,
    reason: best ? best.reasons.join('; ') : 'no backend configured',
    extra_cost_policy: {
      allowed: profile.allow_payg || policy.principles?.allow_payg_by_default === true,
      max_eur: profile.max_extra_cost_eur ?? policy.defaults?.max_extra_cost_eur ?? 0,
    },
  };
}

async function loadPolicy(policyPath) {
  return JSON.parse(await fs.readFile(policyPath, 'utf8'));
}

async function appendDecision(logPath, record) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf8');
}

function human(decision, policy) {
  const backend = policy.backends?.[decision.recommended_backend];
  const lines = [
    `Task: ${decision.profile.task_type} / ${decision.profile.complexity} / risk=${decision.profile.risk}`,
    `Empfehlung: ${backend?.label || decision.recommended_backend}`,
    `Workflow: ${decision.workflow}`,
  ];
  if (decision.reviewer) lines.push(`Unabhängiger Review: ${policy.backends?.[decision.reviewer]?.label || decision.reviewer}`);
  lines.push(`Zusatzkosten: ${decision.extra_cost_policy.allowed ? `erlaubt bis €${decision.extra_cost_policy.max_eur}` : 'nicht erlaubt'}`);
  lines.push(`Grund: ${decision.reason}`);
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const noLog = args.includes('--no-log');
  const policyIndex = args.indexOf('--policy');
  const logIndex = args.indexOf('--log');
  const policyPath = policyIndex >= 0 ? path.resolve(args[policyIndex + 1]) : DEFAULT_POLICY;
  const logPath = logIndex >= 0 ? path.resolve(args[logIndex + 1]) : DEFAULT_LOG;
  const filtered = args.filter((arg, i) => !['--json', '--no-log'].includes(arg) && i !== policyIndex && i !== policyIndex + 1 && i !== logIndex && i !== logIndex + 1);
  const text = filtered.join(' ').trim();

  if (!text) {
    process.stderr.write('Usage: adaptive-router.mjs [--json] [--no-log] [--policy FILE] [--log FILE] "task description"\n');
    process.exit(2);
  }

  const policy = await loadPolicy(policyPath);
  const decision = routeTask(text, policy);
  const record = { timestamp: new Date().toISOString(), input: text, ...decision };
  if (!noLog) await appendDecision(logPath, record);
  process.stdout.write(`${json ? JSON.stringify(decision, null, 2) : human(decision, policy)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`adaptive-router: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
