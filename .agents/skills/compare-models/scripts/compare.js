#!/usr/bin/env node
/**
 * compare-models — Compare two models' responses using OpenClaw's session system
 * 
 * How it works:
 * 1. Creates a temporary session with MODEL_A (via sessions_spawn isolated)
 * 2. Creates a temporary session with MODEL_B (via sessions_spawn isolated)
 * 3. Both answer the same question in parallel
 * 4. Results are formatted and returned
 * 
 * Usage (called by skill):
 *   /compare "question" [model_a] [model_b]
 * 
 * The skill itself just calls this script and formats the output for Telegram.
 */

const { spawn } = require('child_process');
const path = require('path');

// Config — hardcoded model aliases
const MODEL_MAP = {
  'M3':       'minimax/MiniMax-M3',
  'Minimax':  'minimax/MiniMax-M2.7',
  'Kimi':     'kimi/moonshot-k2-6',
  'Codex':    'openai/gpt-5.4',
  'DeepSeek': 'openrouter/deepseek-chat-v3',
  'Qwen':     'openrouter/qwen-2.5-72b-instruct',
  'Gemini':   'openrouter/google-gemini-2.5-flash',
  'Mistral':  'openrouter/mistralai-mistral-nemo',
};

function resolveModel(name) {
  if (!name) return MODEL_MAP['M3'];
  // Already a full provider/model ID
  if (name.includes('/')) return name;
  // Look up alias
  return MODEL_MAP[name] || name;
}

function callModelCli(model, question) {
  return new Promise((resolve, reject) => {
    const args = [
      'model', model,
      '--non-interactive',
      '--exec',
      question,
    ];
    
    const proc = spawn('openclaw', args, {
      cwd: '/root/.openclaw/workspace',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    
    proc.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else resolve(`[Error ${code}] ${stderr.trim() || stdout.trim()}`);
    });
    
    proc.on('error', e => resolve(`[Error] ${e.message}`));
    
    // Timeout 60s
    setTimeout(() => {
      proc.kill();
      resolve('[Timeout after 60s]');
    }, 60000);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const question = args[0] || 'Erkläre Docker in einem Satz.';
  const rawA = args[1] || 'M3';
  const rawB = args[2] || 'Codex';
  
  const modelA = resolveModel(rawA);
  const modelB = resolveModel(rawB);
  
  console.log(`🧪 Vergleich: "${question}"`);
  console.log(`   🤖 ${rawA} → ${modelA}`);
  console.log(`   🤖 ${rawB} → ${modelB}`);
  console.log('');
  console.log('⏳ Beide Modelle werden befragt...');
  console.log('');
  
  // Run both in parallel
  const [respA, respB] = await Promise.all([
    callModelCli(modelA, question),
    callModelCli(modelB, question),
  ]);
  
  console.log('═══════════════════════════════════');
  console.log(`🤖 ${rawA} (${modelA}):`);
  console.log('───────────────────────────────────');
  console.log(respA.slice(0, 1000));
  console.log('');
  console.log('═══════════════════════════════════');
  console.log(`🤖 ${rawB} (${modelB}):`);
  console.log('───────────────────────────────────');
  console.log(respB.slice(0, 1000));
  console.log('');
  console.log('✅ Vergleich abgeschlossen');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
