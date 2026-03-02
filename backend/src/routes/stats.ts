import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const statsRouter = Router();
statsRouter.use(requireAuth);

// Overview stats
statsRouter.get("/overview", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const [totals, recentDay, recentWeek, recentMonth] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total_plays,
                COALESCE(SUM(duration_ms), 0) as total_ms,
                COUNT(DISTINCT track_id) as unique_tracks,
                COUNT(DISTINCT artist_name) as unique_artists
         FROM listen_history WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as plays FROM listen_history
         WHERE user_id=$1 AND played_at > NOW() - INTERVAL '1 day'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as plays FROM listen_history
         WHERE user_id=$1 AND played_at > NOW() - INTERVAL '7 days'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as plays FROM listen_history
         WHERE user_id=$1 AND played_at > NOW() - INTERVAL '30 days'`,
        [userId]
      ),
    ]);

    const t = totals.rows[0];
    res.json({
      totalPlays: Number(t.total_plays),
      totalMinutes: Math.round(Number(t.total_ms) / 60000),
      uniqueTracks: Number(t.unique_tracks),
      uniqueArtists: Number(t.unique_artists),
      playsToday: Number(recentDay.rows[0].plays),
      playsThisWeek: Number(recentWeek.rows[0].plays),
      playsThisMonth: Number(recentMonth.rows[0].plays),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Top tracks
statsRouter.get("/top-tracks", async (req: Request, res: Response) => {
  try {
    const { period = "all", limit = 20 } = req.query;
    const interval = periodToInterval(period as string);
    const { rows } = await pool.query(
      `SELECT track_id, track_name, artist_name, album_name, album_art,
              COUNT(*) as play_count,
              COALESCE(SUM(duration_ms), 0) as total_ms
       FROM listen_history
       WHERE user_id=$1 ${interval}
       GROUP BY track_id, track_name, artist_name, album_name, album_art
       ORDER BY play_count DESC
       LIMIT $2`,
      [req.session.userId, limit]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Top artists
statsRouter.get("/top-artists", async (req: Request, res: Response) => {
  try {
    const { period = "all", limit = 20 } = req.query;
    const interval = periodToInterval(period as string);
    const { rows } = await pool.query(
      `SELECT artist_name,
              COUNT(*) as play_count,
              COUNT(DISTINCT track_id) as unique_tracks,
              COALESCE(SUM(duration_ms), 0) as total_ms
       FROM listen_history
       WHERE user_id=$1 ${interval}
       GROUP BY artist_name
       ORDER BY play_count DESC
       LIMIT $2`,
      [req.session.userId, limit]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Listening activity (heatmap data)
statsRouter.get("/activity", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT DATE(played_at) as date, COUNT(*) as plays
       FROM listen_history
       WHERE user_id=$1 AND played_at > NOW() - INTERVAL '365 days'
       GROUP BY DATE(played_at)
       ORDER BY date`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Listening by hour of day
statsRouter.get("/by-hour", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT EXTRACT(HOUR FROM played_at) as hour, COUNT(*) as plays
       FROM listen_history WHERE user_id=$1
       GROUP BY hour ORDER BY hour`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Recent history
statsRouter.get("/history", async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { rows } = await pool.query(
      `SELECT id, track_id, track_name, artist_name, album_name, album_art, duration_ms, played_at
       FROM listen_history
       WHERE user_id=$1
       ORDER BY played_at DESC
       LIMIT $2 OFFSET $3`,
      [req.session.userId, limit, offset]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Listening streaks
statsRouter.get("/streaks", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT DATE(played_at) as day
       FROM listen_history WHERE user_id=$1
       ORDER BY day DESC`,
      [req.session.userId]
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const dayDate = new Date(rows[i].day);
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);

      if (dayDate.getTime() === expected.getTime()) {
        streak++;
        if (i === 0) currentStreak = streak;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        if (i === 0) currentStreak = 0;
        break;
      }
    }

    res.json({ currentStreak, longestStreak });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

function periodToInterval(period: string): string {
  switch (period) {
    case "day":
      return "AND played_at > NOW() - INTERVAL '1 day'";
    case "week":
      return "AND played_at > NOW() - INTERVAL '7 days'";
    case "month":
      return "AND played_at > NOW() - INTERVAL '30 days'";
    case "year":
      return "AND played_at > NOW() - INTERVAL '365 days'";
    default:
      return "";
  }
}
