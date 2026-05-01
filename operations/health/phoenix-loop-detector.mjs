#!/usr/bin/env node
// Loop detection for Phoenix ↔ Rook Discord conversations
// Tracks timestamps of Phoenix's Discord messages to detect rapid-fire loops

import { promises as fs } from 'fs';
import path from 'path';

const STATE_FILE = '/root/.openclaw/workspace/operations/health/phoenix-loop-state.json';
const WINDOW_MS = 60000;   // 60 seconds
const THRESHOLD = 4;       // 4+ messages = loop warning
const GATEWAY_BASE_URL = process.env.ROOK_GATEWAY_BASE_URL || 'http://127.0.0.1:18789';
const TELEGRAM_CHAT_ID = '549758481';
const MAX_AGE_FILE_MS = 900000; // 15 min — stale data garbage collected

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return { timestamps: [] };
  }
}

async function writeState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function cleanupState(state) {
  const now = Date.now();
  state.timestamps = state.timestamps.filter(ts => (now - ts) < MAX_AGE_FILE_MS);
  state.lastWarningAt = state.lastWarningAt && (now - state.lastWarningAt < MAX_AGE_FILE_MS) ? state.lastWarningAt : null;
}

async function sendTelegramWarning(message) {
  const url = `${GATEWAY_BASE_URL}/hooks/telegram`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: TELEGRAM_CHAT_ID,
        text: `⚠️ **Loop-Warnung**\n\n${message}\n\nSchreib /reset wenn ich stoppen soll.`
      })
    });
  } catch (e) {
    console.error('Failed to send Telegram warning:', e.message);
  }
}

export async function checkPhoenixLoop() {
  const state = await readState();
  await cleanupState(state);

  const now = Date.now();
  // Keep only timestamps within window
  state.timestamps = state.timestamps.filter(ts => (now - ts) < WINDOW_MS);

  const count = state.timestamps.length;

  if (count >= THRESHOLD && !state.lastWarningAt) {
    // First time over threshold in this window — send warning
    state.lastWarningAt = now;
    await writeState(state);
    await sendTelegramWarning(
      `Phoenix hat ${count} Nachrichten in ${WINDOW_MS/1000}s geschickt. ` +
      `Möglicher Loop. Ich mache weiter bis du /reset schreibst.`
    );
    return { loop: true, count, warned: true };
  } else if (count >= THRESHOLD && state.lastWarningAt) {
    // Already warned, just continue (don't re-warn)
    return { loop: true, count, warned: false };
  }

  return { loop: false, count, warned: false };
}

export async function recordPhoenixMessage() {
  const state = await readState();
  await cleanupState(state);
  state.timestamps.push(Date.now());
  await writeState(state);
}

// If run directly via node
const args = process.argv.slice(2);
if (args[0] === 'check') {
  checkPhoenixLoop().then(r => {
    console.log(JSON.stringify(r));
    process.exit(0);
  });
} else if (args[0] === 'record') {
  recordPhoenixMessage().then(() => {
    console.log('OK');
    process.exit(0);
  });
}