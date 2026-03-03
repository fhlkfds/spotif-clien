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

    -- Bookmarks (tracks/albums/artists/playlists)
    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_uri TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

    -- Lyrics cache
    CREATE TABLE IF NOT EXISTS lyrics_cache (
      track_id TEXT PRIMARY KEY,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      synced_lyrics TEXT,
      plain_lyrics TEXT,
      source TEXT DEFAULT 'lrclib',
      fetched_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enhance listen_history for skip/crossfade/session tracking
    ALTER TABLE listen_history
      ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS play_duration_ms INTEGER,
      ADD COLUMN IF NOT EXISTS crossfaded BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS session_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_listen_history_session ON listen_history(session_id);

    -- Smart playlists (rule-based virtual playlists)
    CREATE TABLE IF NOT EXISTS smart_playlists (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      rules JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_smart_playlists_user ON smart_playlists(user_id);

    -- Pinned items (artists/albums/playlists pinned to sidebar)
    CREATE TABLE IF NOT EXISTS pinned_items (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      metadata JSONB,
      position INTEGER DEFAULT 0,
      UNIQUE(user_id, type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_pinned_items_user ON pinned_items(user_id);

    -- User settings (listening modes, crossfade, normalization, etc.)
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      listening_mode TEXT DEFAULT 'normal',
      crossfade_ms INTEGER DEFAULT 0,
      volume_normalize BOOLEAN DEFAULT false,
      custom_start_page TEXT DEFAULT 'home',
      widgets JSONB DEFAULT '["now_playing","top_tracks","recent_artists","new_releases"]',
      keyboard_shortcuts JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audio features cache (BPM, energy, valence, etc.)
    CREATE TABLE IF NOT EXISTS audio_features_cache (
      track_id TEXT PRIMARY KEY,
      danceability FLOAT,
      energy FLOAT,
      key INTEGER,
      loudness FLOAT,
      mode INTEGER,
      speechiness FLOAT,
      acousticness FLOAT,
      instrumentalness FLOAT,
      liveness FLOAT,
      valence FLOAT,
      tempo FLOAT,
      time_signature INTEGER,
      fetched_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("Database initialized");
}
