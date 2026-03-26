const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const PHOTOS_JSON = path.join(ROOT, 'src', '_data', 'photos.json');
const PHOTOS_DIR = path.join(ROOT, 'src', 'img', 'photos');
const SITE_DIR = path.join(ROOT, '_site');

// Parse .env manually
function loadEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const TOKEN = env.TELEGRAM_BOT_TOKEN;
const IONOS_PASS = env.IONOS_PASSWORD;
const IONOS_USER = env.IONOS_USER;
const IONOS_HOST = env.IONOS_HOST;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not found in .env');
  process.exit(1);
}
if (!IONOS_PASS || !IONOS_USER || !IONOS_HOST) {
  console.error('IONOS_PASSWORD, IONOS_USER, or IONOS_HOST not found in .env');
  process.exit(1);
}
const ROOK_CHAT_ID = env.ROOK_CHAT_ID || '';

const API = `https://api.telegram.org/bot${TOKEN}`;
let offset = 0;
let allowedChatId = null;

// --- Telegram API helpers ---

function apiCall(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const url = new URL(`${API}/${method}`);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!json.ok) reject(new Error(`Telegram API error: ${json.description}`));
          else resolve(json.result);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function downloadFile(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, handler).on('error', reject);
        return;
      }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => ws.close(resolve));
      ws.on('error', reject);
    };
    https.get(fileUrl, handler).on('error', reject);
  });
}

function sendMessage(chatId, text) {
  return apiCall('sendMessage', { chat_id: chatId, text });
}

// --- Git helpers ---

function gitExec(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function gitSync(commitMessage) {
  // Stage all photo and data changes
  execSync('git add src/img/photos/ src/_data/photos.json', { cwd: ROOT, stdio: 'pipe' });

  // Commit if there's anything staged
  try {
    gitExec(`git commit -m "${commitMessage}"`);
  } catch (e) {
    // Nothing to commit — that's fine
    console.log('Nothing new to commit.');
  }

  // Pull remote changes (rebasing local commits on top)
  try {
    gitExec('git pull --rebase');
  } catch (e) {
    console.error('git pull --rebase failed, attempting to continue rebase...');
    try { gitExec('git rebase --abort'); } catch (_) {}
    // Force-accept remote state and re-apply our commit
    gitExec('git stash');
    gitExec('git pull');
    gitExec('git stash pop');
    execSync('git add src/img/photos/ src/_data/photos.json', { cwd: ROOT, stdio: 'pipe' });
    try { gitExec(`git commit -m "${commitMessage}"`); } catch (_) {}
  }

  gitExec('git push');
  console.log('Git sync complete.');
}

// --- Caption parsing ---

function parseCaption(caption) {
  if (!caption || !caption.trim()) {
    return { title: 'Untitled', tags: [], description: '' };
  }

  const parts = caption.split('|').map((s) => s.trim());
  const title = parts[0] || 'Untitled';
  const tags = parts[1]
    ? parts[1].split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
    : [];
  const description = parts[2] || '';

  return { title, tags, description };
}

// --- Photo handling ---

function generateFilename() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('') + '.jpg';
}

function getNextId(photos) {
  let max = 0;
  for (const p of photos) {
    const n = parseInt(p.id, 10);
    if (n > max) max = n;
  }
  return String(max + 1).padStart(3, '0');
}

function getDateString() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

async function handlePhoto(msg) {
  const chatId = msg.chat.id;

  // Security: lock to first chat that sends a message
  if (allowedChatId === null) {
    allowedChatId = chatId;
    console.log(`Locked to chat ID: ${allowedChatId}`);
  }
  if (chatId !== allowedChatId) {
    console.log(`Rejected message from unauthorized chat: ${chatId}`);
    return;
  }

  const photos = msg.photo;
  if (!photos || photos.length === 0) return;

  // Get highest resolution (last in array)
  const largest = photos[photos.length - 1];
  console.log(`Received photo: file_id=${largest.file_id}, size=${largest.file_size || '?'}`);

  try {
    // Get file path from Telegram
    const fileInfo = await apiCall('getFile', { file_id: largest.file_id });
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    // Generate filename and save
    const filename = generateFilename();
    const destPath = path.join(PHOTOS_DIR, filename);

    // Ensure photos directory exists
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });

    console.log(`Downloading to ${destPath}...`);
    await downloadFile(fileUrl, destPath);
    console.log('Download complete.');

    // Parse caption
    const { title, tags, description } = parseCaption(msg.caption);

    // Update photos.json
    let photosData = [];
    try {
      photosData = JSON.parse(fs.readFileSync(PHOTOS_JSON, 'utf8'));
    } catch (e) {
      console.log('photos.json not found or invalid, starting fresh.');
    }

    const newEntry = {
      id: getNextId(photosData),
      title,
      date: getDateString(),
      src: `/img/photos/${filename}`,
      external: false,
      alt: title,
      tags,
    };
    if (description) {
      newEntry.description = description;
    }

    photosData.push(newEntry);
    fs.writeFileSync(PHOTOS_JSON, JSON.stringify(photosData, null, 2) + '\n');
    console.log(`Added entry: ${JSON.stringify(newEntry)}`);

    // Commit and push to git
    console.log('Committing to git...');
    gitSync(`Add photo: ${title.replace(/"/g, '\\"')}`);

    // Build site
    console.log('Building site...');
    execSync('npx @11ty/eleventy', { cwd: ROOT, stdio: 'inherit' });
    console.log('Build complete.');

    // Deploy via rsync with sshpass
    console.log('Deploying...');
    execSync(
      `sshpass -p '${IONOS_PASS.replace(/'/g, "'\\''")}' rsync -avz --delete -e 'ssh -o StrictHostKeyChecking=accept-new' ${SITE_DIR}/ ${IONOS_USER}@${IONOS_HOST}:~/public/`,
      { cwd: ROOT, stdio: 'inherit' }
    );
    console.log('Deploy complete.');

    await sendMessage(chatId, `Done! "${title}" is live.\nID: ${newEntry.id} | Tags: ${tags.join(', ') || 'none'}`);

    // Notify Rook via group chat
    if (ROOK_CHAT_ID) {
      const notify = [
        `📷 New photo uploaded: "${title}"`,
        `ID: ${newEntry.id}`,
        `Tags: ${tags.join(', ') || 'none'}`,
        `File: ${newEntry.src}`,
        description ? `Description: ${description}` : '',
        '',
        '@MarcusNewClawbot please review this photo and improve the metadata — tags, alt text, and description. Edit src/_data/photos.json on the VPS, then commit and rebuild.',
      ].filter(Boolean).join('\n');
      await sendMessage(ROOK_CHAT_ID, notify).catch((err) => {
        console.error('Failed to notify Rook:', err.message);
      });
    }
  } catch (err) {
    console.error('Error processing photo:', err);
    await sendMessage(chatId, `Error: ${err.message}`).catch(() => {});
  }
}

// --- Polling loop ---

async function poll() {
  while (true) {
    try {
      const updates = await apiCall('getUpdates', {
        offset,
        timeout: 30,
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg) continue;

        if (msg.photo) {
          await handlePhoto(msg);
        } else {
          // Non-photo message
          if (allowedChatId === null) {
            allowedChatId = msg.chat.id;
            console.log(`Locked to chat ID: ${allowedChatId}`);
          }
          if (msg.chat.id === allowedChatId) {
            await sendMessage(msg.chat.id, 'Send me a photo with an optional caption: Title | TAGS | Description');
          }
        }
      }
    } catch (err) {
      console.error('Poll error:', err.message);
      // Wait before retrying on error
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// --- Start ---

console.log('Telegram photo bot starting...');
console.log(`Photos dir: ${PHOTOS_DIR}`);
console.log(`Photos JSON: ${PHOTOS_JSON}`);

// Sync any uncommitted photos left from a previous crash
try {
  gitSync('Add uncommitted photos from previous session');
} catch (e) {
  console.error('Startup git sync failed (non-fatal):', e.message);
}

poll();
