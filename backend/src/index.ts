import express from "express";
import cors from "cors";
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";

import { initDb } from "./db";
import { authRouter } from "./routes/auth";
import { spotifyRouter } from "./routes/spotify";
import { downloadsRouter } from "./routes/downloads";
import { statsRouter } from "./routes/stats";
import { themesRouter } from "./routes/themes";
import { pluginsRouter } from "./routes/plugins";
import { lastfmRouter } from "./routes/lastfm";
import { lyricsRouter } from "./routes/lyrics";
import { bookmarksRouter } from "./routes/bookmarks";
import { offlineRouter } from "./routes/offline";
import { smartPlaylistsRouter } from "./routes/smart_playlists";
import { pinnedRouter } from "./routes/pinned";
import { userSettingsRouter } from "./routes/user_settings";

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT ?? 3001);

// Redis client for sessions
const redisClient = createClient({ url: process.env.REDIS_URL ?? "redis://redis:6379" });
redisClient.connect().catch(console.error);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Only set secure=true when explicitly serving over HTTPS.
    // NODE_ENV=production over plain HTTP (e.g. local Docker) will drop secure cookies.
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
});
app.use(sessionMiddleware);

// Static built-in themes
app.use("/themes/builtin", express.static(path.join(__dirname, "../themes")));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/spotify", spotifyRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/themes", themesRouter);
app.use("/api/plugins", pluginsRouter);
app.use("/api/lastfm", lastfmRouter);
app.use("/api/lyrics", lyricsRouter);
app.use("/api/bookmarks", bookmarksRouter);
app.use("/api/offline", offlineRouter);
app.use("/api/smart-playlists", smartPlaylistsRouter);
app.use("/api/pinned", pinnedRouter);
app.use("/api/user-settings", userSettingsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// WebSocket for real-time player sync between tabs
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  sessionMiddleware(req as express.Request, {} as express.Response, () => {
    const userId = (req as express.Request).session?.userId;
    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(msg));
          }
        });
      } catch {
        // ignore bad messages
      }
    });
  });
});

async function start() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
