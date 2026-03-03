import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const offlineRouter = Router();
offlineRouter.use(requireAuth);

// List completed downloads with file_url for offline playback
offlineRouter.get("/tracks", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, track_id, track_name, artist_name, file_path, file_size, format, downloaded_at, status
       FROM downloads
       WHERE user_id=$1 AND status='completed'
       ORDER BY downloaded_at DESC`,
      [req.session.userId]
    );
    const tracks = rows.map((row) => ({
      ...row,
      file_url: `/api/downloads/${row.id}/file`,
    }));
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
