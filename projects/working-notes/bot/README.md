# Telegram Photo Bot

A zero-dependency Node.js bot that lets you add photos to the site gallery by sending them via Telegram. The bot downloads the photo, updates `photos.json`, rebuilds the site with Eleventy, and deploys to IONOS — all automatically.

## How It Works

```
Phone (Telegram) → Telegram API → Bot on VPS
                                    ├── saves photo to src/img/photos/
                                    ├── updates src/_data/photos.json
                                    ├── builds site (eleventy)
                                    └── deploys via rsync → IONOS
```

Send a photo to your bot with a caption in this format:

```
Title | TAG1, TAG2 | Description
```

All parts are optional:

- `Berlin rooftop | BERLIN, URBAN | View from the office` — full caption
- `Server rack | TECH` — no description
- `Coffee` — just a title, no tags, no description
- *(no caption)* — defaults to "Untitled"

Tags are auto-uppercased. The bot replies with a confirmation once the photo is live.

## Prerequisites

- **Node.js 18+** on the server
- **rsync** and **sshpass** on the server
- **npm dependencies** installed in the project root (`npm install` for Eleventy)
- SSH/SFTP access to your IONOS webspace

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g. "Marcus Gallery Bot") and username (e.g. `marcus_gallery_bot`)
4. BotFather gives you a token like `123456789:ABCdef...` — save it

### 2. Create an IONOS SSH/SFTP Account

1. Log into your IONOS control panel
2. Go to **Hosting → SSH/SFTP Access** (or similar)
3. Create a new account — you'll get a username, hostname, and password
4. Note the port (usually 22)

### 3. Configure Environment

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
TELEGRAM_BOT_TOKEN=123456789:ABCdef-your-token-here
IONOS_PASSWORD=your-ionos-password
IONOS_USER=su123456
IONOS_HOST=access-1234567890.webspace-host.com
```

The `.env` file is gitignored and should never be committed.

### 4. Install Dependencies

```bash
# In the project root (not the bot/ directory)
npm install

# On the server, also install sshpass
apt install sshpass    # Debian/Ubuntu
```

### 5. Test Locally

```bash
node bot/telegram-photo.js
```

Send a photo to your bot on Telegram. You should see log output as it downloads, builds, and deploys.

### 6. Deploy to a VPS (Recommended)

Running the bot on an always-on server means it works even when your laptop is off.

Copy the project to your server:

```bash
rsync -avz --exclude='node_modules' --exclude='_site' --exclude='.cache' --exclude='.env' \
  ./ youruser@your-server:/path/to/marcus-cyborg/
```

On the server:

```bash
cd /path/to/marcus-cyborg
npm install
# Create .env with your credentials (see step 3)
```

### 7. Set Up systemd Service

The included `telegram-photo.service` file keeps the bot running and auto-restarts on failure or reboot.

Edit the service file to match your paths and user if needed:

```bash
nano bot/telegram-photo.service
```

Install it:

```bash
cp bot/telegram-photo.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable telegram-photo
systemctl start telegram-photo
```

## Managing the Service

```bash
# Check if the bot is running
systemctl status telegram-photo

# View live logs
journalctl -u telegram-photo -f

# View recent logs (last 50 lines)
journalctl -u telegram-photo -n 50

# Restart the bot
systemctl restart telegram-photo

# Stop the bot
systemctl stop telegram-photo

# Start the bot
systemctl start telegram-photo
```

## Security Notes

- The bot locks to the **first Telegram chat** that sends it a message. All other chats are rejected. If you need to reset this, restart the service.
- The bot token and IONOS password live in `.env` which is gitignored.
- After initial setup, consider regenerating the Telegram bot token via @BotFather (`/revoke`) if it was shared during configuration.
- The `telegram-photo.service` file assumes the project lives at `/root/marcus-cyborg/`. Adjust the paths if your setup is different.

## Gallery Entry Format

Each photo creates an entry in `src/_data/photos.json`:

```json
{
  "id": "002",
  "title": "Berlin rooftop",
  "date": "2026-02",
  "src": "/img/photos/20260208-153042.jpg",
  "external": false,
  "alt": "Berlin rooftop",
  "tags": ["BERLIN", "URBAN"],
  "description": "View from the office"
}
```

- `id` — auto-incremented, zero-padded to 3 digits
- `date` — year-month when the photo was sent
- `src` — path to the saved image
- `alt` — same as the title (used for accessibility)
- `tags` — from the caption, auto-uppercased
- `description` — optional, from the caption

## No External Dependencies

The bot uses only Node.js built-in modules: `https`, `fs`, `path`, `child_process`. No `npm install` is needed for the bot itself — only for Eleventy in the project root.
