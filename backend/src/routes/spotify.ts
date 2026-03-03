import { Router, Request, Response } from "express";
import { requireAuth, refreshTokenIfNeeded } from "../middleware/auth";
import { pool } from "../db";

export const spotifyRouter = Router();
spotifyRouter.use(refreshTokenIfNeeded);
spotifyRouter.use(requireAuth);

class SpotifyApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

function errStatus(err: unknown): number {
  return err instanceof SpotifyApiError ? err.statusCode : 500;
}

async function spotifyFetch(token: string, path: string, options?: RequestInit) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new SpotifyApiError(res.status, `Spotify ${res.status}: ${body}`);
  }
  return res.json();
}

// Search
spotifyRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, type = "track,album,artist,playlist", limit = 20 } = req.query;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/search?q=${encodeURIComponent(q as string)}&type=${type}&limit=${limit}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Now playing
spotifyRouter.get("/player", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(req.session.accessToken!, "/me/player");
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Player controls
spotifyRouter.post("/player/play", async (req: Request, res: Response) => {
  try {
    const { device_id, ...body } = req.body;
    const qs = device_id ? `?device_id=${device_id}` : "";
    await spotifyFetch(req.session.accessToken!, `/me/player/play${qs}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/pause", async (req: Request, res: Response) => {
  try {
    await spotifyFetch(req.session.accessToken!, "/me/player/pause", {
      method: "PUT",
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/next", async (req: Request, res: Response) => {
  try {
    await spotifyFetch(req.session.accessToken!, "/me/player/next", {
      method: "POST",
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/previous", async (req: Request, res: Response) => {
  try {
    await spotifyFetch(req.session.accessToken!, "/me/player/previous", {
      method: "POST",
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/seek", async (req: Request, res: Response) => {
  try {
    const { position_ms } = req.body;
    await spotifyFetch(
      req.session.accessToken!,
      `/me/player/seek?position_ms=${position_ms}`,
      { method: "PUT" }
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/volume", async (req: Request, res: Response) => {
  try {
    const { volume_percent } = req.body;
    await spotifyFetch(
      req.session.accessToken!,
      `/me/player/volume?volume_percent=${volume_percent}`,
      { method: "PUT" }
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/shuffle", async (req: Request, res: Response) => {
  try {
    const { state } = req.body;
    await spotifyFetch(
      req.session.accessToken!,
      `/me/player/shuffle?state=${state}`,
      { method: "PUT" }
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/repeat", async (req: Request, res: Response) => {
  try {
    const { state } = req.body;
    await spotifyFetch(
      req.session.accessToken!,
      `/me/player/repeat?state=${state}`,
      { method: "PUT" }
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/player/transfer", async (req: Request, res: Response) => {
  try {
    const { device_ids, play } = req.body;
    await spotifyFetch(req.session.accessToken!, "/me/player", {
      method: "PUT",
      body: JSON.stringify({ device_ids, play }),
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Log play for stats (enhanced with skip/crossfade/session)
spotifyRouter.post("/player/log", async (req: Request, res: Response) => {
  try {
    const {
      track_id, track_name, artist_name, album_name, album_art, duration_ms,
      skipped, play_duration_ms, crossfaded, session_id,
    } = req.body;
    await pool.query(
      `INSERT INTO listen_history
         (track_id, track_name, artist_name, album_name, album_art, duration_ms, user_id,
          skipped, play_duration_ms, crossfaded, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        track_id, track_name, artist_name, album_name, album_art, duration_ms,
        req.session.userId,
        skipped ?? false,
        play_duration_ms ?? null,
        crossfaded ?? false,
        session_id ?? null,
      ]
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Library
spotifyRouter.get("/me/playlists", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/me/playlists?limit=50`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get("/me/tracks", async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/me/tracks?limit=${limit}&offset=${offset}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get("/me/top/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { time_range = "medium_term", limit = 20 } = req.query;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/me/top/${type}?time_range=${time_range}&limit=${limit}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get("/me/recently-played", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/me/player/recently-played?limit=50`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Playlists
spotifyRouter.get("/playlists/:id", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/playlists/${req.params.id}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get("/playlists/:id/tracks", async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/playlists/${req.params.id}/tracks?limit=${limit}&offset=${offset}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Albums
spotifyRouter.get("/albums/:id", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/albums/${req.params.id}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Artists
spotifyRouter.get("/artists/:id", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/artists/${req.params.id}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get(
  "/artists/:id/top-tracks",
  async (req: Request, res: Response) => {
    try {
      const data = await spotifyFetch(
        req.session.accessToken!,
        `/artists/${req.params.id}/top-tracks?market=US`
      );
      res.json(data);
    } catch (err: unknown) {
      res.status(errStatus(err)).json({ error: String(err) });
    }
  }
);

// Recommendations
spotifyRouter.get("/recommendations", async (req: Request, res: Response) => {
  try {
    const { seed_tracks, seed_artists, seed_genres, limit = 20 } = req.query;
    const params = new URLSearchParams({ limit: String(limit) });
    if (seed_tracks) params.set("seed_tracks", seed_tracks as string);
    if (seed_artists) params.set("seed_artists", seed_artists as string);
    if (seed_genres) params.set("seed_genres", seed_genres as string);
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/recommendations?${params}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Devices
spotifyRouter.get("/devices", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      "/me/player/devices"
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// SDK token (for Web Playback SDK)
spotifyRouter.get("/sdk-token", (req: Request, res: Response) => {
  res.json({ token: req.session.accessToken });
});

// Check if tracks are saved
spotifyRouter.get("/me/tracks/contains", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/me/tracks/contains?ids=${req.query.ids}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Save tracks
spotifyRouter.put("/me/tracks", async (req: Request, res: Response) => {
  try {
    await spotifyFetch(req.session.accessToken!, "/me/tracks", {
      method: "PUT",
      body: JSON.stringify({ ids: req.body.ids }),
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Remove tracks
spotifyRouter.delete("/me/tracks", async (req: Request, res: Response) => {
  try {
    await spotifyFetch(req.session.accessToken!, "/me/tracks", {
      method: "DELETE",
      body: JSON.stringify({ ids: req.body.ids }),
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Queue
spotifyRouter.get("/queue", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(req.session.accessToken!, "/me/player/queue");
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.post("/queue", async (req: Request, res: Response) => {
  try {
    const { uri } = req.body;
    await spotifyFetch(
      req.session.accessToken!,
      `/me/player/queue?uri=${encodeURIComponent(uri)}`,
      { method: "POST" }
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Browse
spotifyRouter.get("/browse/new-releases", async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/browse/new-releases?limit=${limit}&offset=${offset}`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get("/browse/categories", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(req.session.accessToken!, "/browse/categories");
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Enhanced artist endpoints
spotifyRouter.get("/artists/:id/albums", async (req: Request, res: Response) => {
  try {
    const { include_groups = "album,single,appears_on", limit = 50 } = req.query;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/artists/${req.params.id}/albums?include_groups=${include_groups}&limit=${limit}&market=US`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.get("/artists/:id/related", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/artists/${req.params.id}/related-artists`
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Single track
spotifyRouter.get("/tracks/:id", async (req: Request, res: Response) => {
  try {
    const data = await spotifyFetch(req.session.accessToken!, `/tracks/${req.params.id}`);
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Playlist track management
spotifyRouter.post("/playlists/:id/tracks", async (req: Request, res: Response) => {
  try {
    const { uris } = req.body;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/playlists/${req.params.id}/tracks`,
      { method: "POST", body: JSON.stringify({ uris }) }
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

spotifyRouter.delete("/playlists/:id/tracks", async (req: Request, res: Response) => {
  try {
    const { uris } = req.body;
    const tracks = (uris as string[]).map((uri) => ({ uri }));
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/playlists/${req.params.id}/tracks`,
      { method: "DELETE", body: JSON.stringify({ tracks }) }
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Audio features - single track
spotifyRouter.get("/audio-features/:id", async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cached = await pool.query(
      "SELECT * FROM audio_features_cache WHERE track_id = $1",
      [req.params.id]
    );
    if (cached.rows.length > 0) {
      return res.json(cached.rows[0]);
    }
    const data = await spotifyFetch(req.session.accessToken!, `/audio-features/${req.params.id}`);
    if (data) {
      await pool.query(
        `INSERT INTO audio_features_cache
           (track_id, danceability, energy, key, loudness, mode, speechiness, acousticness,
            instrumentalness, liveness, valence, tempo, time_signature)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (track_id) DO UPDATE SET
           danceability=EXCLUDED.danceability, energy=EXCLUDED.energy, tempo=EXCLUDED.tempo,
           valence=EXCLUDED.valence, fetched_at=NOW()`,
        [req.params.id, data.danceability, data.energy, data.key, data.loudness,
         data.mode, data.speechiness, data.acousticness, data.instrumentalness,
         data.liveness, data.valence, data.tempo, data.time_signature]
      );
    }
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Audio features - batch (up to 100 ids)
spotifyRouter.get("/audio-features", async (req: Request, res: Response) => {
  try {
    const ids = (req.query.ids as string)?.split(",").filter(Boolean) ?? [];
    if (!ids.length) return res.json({ audio_features: [] });

    // Check cache for all
    const cached = await pool.query(
      "SELECT * FROM audio_features_cache WHERE track_id = ANY($1)",
      [ids]
    );
    const cachedMap = new Map(cached.rows.map((r: { track_id: string }) => [r.track_id, r]));
    const missing = ids.filter((id) => !cachedMap.has(id));

    let fetched: Record<string, unknown>[] = [];
    if (missing.length > 0) {
      const data = await spotifyFetch(
        req.session.accessToken!,
        `/audio-features?ids=${missing.join(",")}`
      );
      fetched = (data?.audio_features ?? []).filter(Boolean);
      // Cache missing ones
      for (const f of fetched) {
        await pool.query(
          `INSERT INTO audio_features_cache
             (track_id, danceability, energy, key, loudness, mode, speechiness, acousticness,
              instrumentalness, liveness, valence, tempo, time_signature)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (track_id) DO NOTHING`,
          [(f as { id: string }).id, (f as Record<string, number>).danceability,
           (f as Record<string, number>).energy, (f as Record<string, number>).key,
           (f as Record<string, number>).loudness, (f as Record<string, number>).mode,
           (f as Record<string, number>).speechiness, (f as Record<string, number>).acousticness,
           (f as Record<string, number>).instrumentalness, (f as Record<string, number>).liveness,
           (f as Record<string, number>).valence, (f as Record<string, number>).tempo,
           (f as Record<string, number>).time_signature]
        ).catch(() => {});
      }
    }

    const fetchedMap = new Map(fetched.map((f) => [(f as { id: string }).id, f]));
    const result = ids.map((id) => cachedMap.get(id) ?? fetchedMap.get(id) ?? null);
    res.json({ audio_features: result });
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});

// Create playlist
spotifyRouter.post("/users/:userId/playlists", async (req: Request, res: Response) => {
  try {
    const { name, description, public: isPublic } = req.body;
    const data = await spotifyFetch(
      req.session.accessToken!,
      `/users/${req.params.userId}/playlists`,
      {
        method: "POST",
        body: JSON.stringify({ name, description, public: isPublic }),
      }
    );
    res.json(data);
  } catch (err: unknown) {
    res.status(errStatus(err)).json({ error: String(err) });
  }
});
