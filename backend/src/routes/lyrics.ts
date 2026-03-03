import { Router, Request, Response } from "express";
import { pool } from "../db";

export const lyricsRouter = Router();

lyricsRouter.get("/", async (req: Request, res: Response) => {
  const { track_id, artist, title } = req.query as Record<string, string>;
  if (!track_id || !artist || !title) {
    res.status(400).json({ error: "track_id, artist, title required" });
    return;
  }

  try {
    // Check cache
    const cached = await pool.query(
      "SELECT synced_lyrics, plain_lyrics, source FROM lyrics_cache WHERE track_id = $1",
      [track_id]
    );
    if (cached.rows.length > 0) {
      res.json(cached.rows[0]);
      return;
    }

    // Fetch from lrclib
    const url = new URL("https://lrclib.net/api/get");
    url.searchParams.set("artist_name", artist);
    url.searchParams.set("track_name", title);
    const resp = await fetch(url.toString(), {
      headers: { "Lrclib-Client": "SpotClient/1.0 (https://github.com/spotclient)" },
    });

    let synced_lyrics: string | null = null;
    let plain_lyrics: string | null = null;

    if (resp.ok) {
      const data = await resp.json() as { syncedLyrics?: string; plainLyrics?: string };
      synced_lyrics = data.syncedLyrics ?? null;
      plain_lyrics = data.plainLyrics ?? null;
    }

    // Cache result (even if empty, to avoid repeated fetches)
    await pool.query(
      `INSERT INTO lyrics_cache (track_id, artist, title, synced_lyrics, plain_lyrics, source)
       VALUES ($1, $2, $3, $4, $5, 'lrclib')
       ON CONFLICT (track_id) DO UPDATE
         SET synced_lyrics = EXCLUDED.synced_lyrics,
             plain_lyrics = EXCLUDED.plain_lyrics,
             fetched_at = NOW()`,
      [track_id, artist, title, synced_lyrics, plain_lyrics]
    );

    res.json({ synced_lyrics, plain_lyrics, source: "lrclib" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
