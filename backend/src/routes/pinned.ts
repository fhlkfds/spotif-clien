import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const pinnedRouter = Router();
pinnedRouter.use(requireAuth);

pinnedRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pinned_items WHERE user_id=$1 ORDER BY position ASC, id ASC",
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

pinnedRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { type, item_id, item_name, metadata } = req.body;
    // Get next position
    const { rows: posRows } = await pool.query(
      "SELECT COALESCE(MAX(position),0)+1 as next_pos FROM pinned_items WHERE user_id=$1",
      [req.session.userId]
    );
    const { rows } = await pool.query(
      `INSERT INTO pinned_items (user_id, type, item_id, item_name, metadata, position)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,type,item_id) DO NOTHING RETURNING *`,
      [req.session.userId, type, item_id, item_name, JSON.stringify(metadata ?? {}), posRows[0].next_pos]
    );
    res.json(rows[0] ?? { success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

pinnedRouter.delete("/:type/:itemId", async (req: Request, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM pinned_items WHERE user_id=$1 AND type=$2 AND item_id=$3",
      [req.session.userId, req.params.type, req.params.itemId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

pinnedRouter.get("/:type/:itemId/check", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM pinned_items WHERE user_id=$1 AND type=$2 AND item_id=$3",
      [req.session.userId, req.params.type, req.params.itemId]
    );
    res.json({ pinned: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
