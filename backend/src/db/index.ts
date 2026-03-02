import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listen_history (
      id SERIAL PRIMARY KEY,
      track_id TEXT NOT NULL,
      track_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      album_name TEXT,
      album_art TEXT,
      duration_ms INTEGER,
      played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id SERIAL PRIMARY KEY,
      track_id TEXT,
      track_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size BIGINT,
      format TEXT DEFAULT 'mp3',
      downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS user_themes (
      user_id TEXT PRIMARY KEY,
      theme_name TEXT NOT NULL DEFAULT 'dark',
      custom_css TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_plugins (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      plugin_name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      config JSONB,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, plugin_name)
    );

    CREATE INDEX IF NOT EXISTS idx_listen_history_user ON listen_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_listen_history_played ON listen_history(played_at DESC);
    CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
  `);

  console.log("Database initialized");
}
