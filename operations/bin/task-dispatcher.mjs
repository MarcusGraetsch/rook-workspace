#!/usr/bin/env node
// Thin backwards-compatible entry point.
// Dispatches to the modular index.mjs so the systemd service keeps working
// without changes to its ExecStart line.

import { main } from './dispatcher/index.mjs';
import { appendLog } from './dispatcher/notify.mjs';

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  await appendLog({
    ts: new Date().toISOString(),
    action: 'fatal',
    error: message,
  });
  console.error(`[dispatcher] fatal: ${message}`);
  process.exitCode = 1;
});
