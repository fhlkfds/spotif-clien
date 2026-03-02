# SpotClient — Spotify Third-Party Client for Linux

A feature-rich Spotify client for Linux with custom themes, plugins, yt-dlp downloads, and detailed listening stats. Deployed via Docker Compose.

## Features

- **Full Spotify Playback** — Web Playback SDK (Premium required) or API control for non-premium
- **Custom Themes** — 7 built-in themes (Dark, Light, Dracula, Nord, Catppuccin, Gruvbox, Solarized) + custom CSS editor
- **Plugin System** — Extend with JS plugins (Discord RPC, Last.fm scrobbler included)
- **yt-dlp Downloads** — Download any track as MP3/FLAC/OGG via yt-dlp
- **Listening Stats** — Play history, top tracks/artists, heatmaps, streaks
- **All in Docker** — One command deploy

## Quick Start

### 1. Get Spotify API credentials

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Set Redirect URI to `http://localhost/api/auth/callback`
4. Copy Client ID and Client Secret

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
nano .env
```

### 3. Deploy

```bash
docker compose up -d
```

Open [http://localhost](http://localhost) and log in with Spotify.

## Themes

Built-in themes: `dark`, `light`, `dracula`, `nord`, `catppuccin`, `gruvbox`, `solarized`

### Add a custom theme

1. Create a CSS file with CSS custom properties overrides
2. Either use the in-app CSS editor (Settings → Themes) or drop a `.css` file into `./themes/`

Example:
```css
:root {
  --bg-primary: #0d1117;
  --accent: #ff79c6;
  --text-primary: #c9d1d9;
}
```

## Plugins

Plugins live in `./plugins/<name>/` with:
- `manifest.json` — plugin metadata
- `bundle.js` — ES module with a default export implementing `{ name, version, activate(api), deactivate() }`

### Plugin API

```js
const plugin = {
  name: "my-plugin",
  version: "1.0.0",
  activate(api) {
    // Subscribe to events
    api.events.on("track:change", (track) => {
      console.log("Now playing:", track.name);
    });

    // Register UI slots
    api.ui.registerSlot({
      id: "my-plugin:widget",
      slot: "sidebar-bottom",
      render() {
        const el = document.createElement("div");
        el.textContent = "My Plugin Widget";
        return el;
      },
    });

    // Persistent storage
    api.storage.set("key", "value");
    const val = api.storage.get("key");

    // Player access
    const track = api.player.getCurrentTrack();
  },
  deactivate() {
    // cleanup
  },
};
export default plugin;
```

### Available Events

| Event | Payload |
|-------|---------|
| `track:change` | `SpotifyTrack` |
| `player:play` | `SpotifyTrack` |
| `player:pause` | `PlaybackState` |
| `player:seek` | `number` (ms) |
| `app:ready` | `void` |

### UI Slots

| Slot | Location |
|------|----------|
| `sidebar-bottom` | Bottom of the sidebar |
| `player-extra` | Player bar extras |
| `now-playing-extra` | Now playing panel |

## Downloads

Click the **download icon** in the player bar to queue a track download via yt-dlp.
Manage downloads in Settings → Downloads.

Files are saved to `./downloads/` and served at `/downloads/`.

## Stats

All listening events are tracked locally in PostgreSQL.
View stats at `/stats` — includes:
- Play counts, listening time
- Top tracks and artists by time period
- Daily activity heatmap
- Listening streaks

## Architecture

```
nginx (80) ──┬── /api/*    → backend:3001 (Node.js + Express)
             ├── /ws       → backend:3001 (WebSocket)
             └── /*        → frontend:5173 (React + Vite)

backend ──── postgres:5432 (stats, downloads, themes, plugins)
         └── redis:6379    (sessions)
```

## Development

```bash
# Start just the DB services
docker compose up postgres redis -d

# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL |
| `SESSION_SECRET` | Random secret for session signing |
| `DB_PASSWORD` | PostgreSQL password |
| `FRONTEND_URL` | Frontend origin (for CORS) |
