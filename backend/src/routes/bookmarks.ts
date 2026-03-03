import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const bookmarksRouter = Router();
bookmarksRouter.use(requireAuth);

// List bookmarks (optional filter by type)
bookmarksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const userId = req.session.userId;
    const { rows } = type
      ? await pool.query(
          "SELECT * FROM bookmarks WHERE user_id=$1 AND type=$2 ORDER BY created_at DESC",
          [userId, type]
        )
      : await pool.query(
          "SELECT * FROM bookmarks WHERE user_id=$1 ORDER BY created_at DESC",
          [userId]
        );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Add bookmark
bookmarksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { type, item_id, item_name, item_uri, metadata } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO bookmarks (user_id, type, item_id, item_name, item_uri, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, type, item_id) DO UPDATE
         SET item_name = EXCLUDED.item_name,
             item_uri = EXCLUDED.item_uri,
             metadata = EXCLUDED.metadata
       RETURNING *`,
      [req.session.userId, type, item_id, item_name, item_uri ?? null, metadata ? JSON.stringify(metadata) : null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Remove bookmark
bookmarksRouter.delete("/:type/:itemId", async (req: Request, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM bookmarks WHERE user_id=$1 AND type=$2 AND item_id=$3",
      [req.session.userId, req.params.type, req.params.itemId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Check if bookmarked
bookmarksRouter.get("/:type/:itemId/check", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM bookmarks WHERE user_id=$1 AND type=$2 AND item_id=$3",
      [req.session.userId, req.params.type, req.params.itemId]
    );
    res.json({ bookmarked: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
