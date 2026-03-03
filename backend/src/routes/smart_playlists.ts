import { Router, Request, Response } from "express";
import { requireAuth, refreshTokenIfNeeded } from "../middleware/auth";
import { pool } from "../db";

export const smartPlaylistsRouter = Router();
smartPlaylistsRouter.use(requireAuth);

// List smart playlists
smartPlaylistsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM smart_playlists WHERE user_id=$1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Create smart playlist
smartPlaylistsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description = "", rules = [] } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO smart_playlists (user_id, name, description, rules)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.session.userId, name, description, JSON.stringify(rules)]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Update smart playlist
smartPlaylistsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, description, rules } = req.body;
    const { rows } = await pool.query(
      `UPDATE smart_playlists
       SET name=COALESCE($1,name), description=COALESCE($2,description),
           rules=COALESCE($3,rules), updated_at=NOW()
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [name, description, rules ? JSON.stringify(rules) : null, req.params.id, req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Delete smart playlist
smartPlaylistsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM smart_playlists WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Evaluate smart playlist rules against listen_history + audio features cache
smartPlaylistsRouter.get("/:id/tracks", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM smart_playlists WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const rules: Array<{ field: string; op: string; value: number | string }> = rows[0].rules ?? [];

    // Build a query joining listen_history with audio_features_cache
    let whereClause = "lh.user_id = $1";
    const params: (string | number)[] = [req.session.userId!];
    let paramIdx = 2;

    for (const rule of rules) {
      const { field, op, value } = rule;
      if (field === "play_count") {
        // Handle by grouping - will be applied after
        continue;
      }
      if (field === "energy" || field === "valence" || field === "tempo" ||
          field === "danceability" || field === "acousticness") {
        const sqlOp = op === "gt" ? ">" : op === "lt" ? "<" : op === "eq" ? "=" : ">=";
        whereClause += ` AND af.${field} ${sqlOp} $${paramIdx}`;
        params.push(Number(value));
        paramIdx++;
      }
      if (field === "liked_within_days" && op === "eq") {
        whereClause += ` AND lh.played_at >= NOW() - INTERVAL '${Number(value)} days'`;
      }
      if (field === "skipped" && op === "eq") {
        whereClause += ` AND lh.skipped = ${value === true || value === "true" ? "true" : "false"}`;
      }
    }

    const { rows: trackRows } = await pool.query(
      `SELECT lh.track_id, lh.track_name, lh.artist_name, lh.album_name, lh.album_art,
              COUNT(lh.id) as play_count,
              af.energy, af.valence, af.tempo, af.danceability
       FROM listen_history lh
       LEFT JOIN audio_features_cache af ON af.track_id = lh.track_id
       WHERE ${whereClause}
       GROUP BY lh.track_id, lh.track_name, lh.artist_name, lh.album_name, lh.album_art,
                af.energy, af.valence, af.tempo, af.danceability
       ORDER BY play_count DESC
       LIMIT 100`,
      params
    );

    // Apply play_count rules post-group
    const playCountRules = rules.filter((r) => r.field === "play_count");
    const filtered = trackRows.filter((row) => {
      return playCountRules.every((rule) => {
        const pc = Number(row.play_count);
        if (rule.op === "lt") return pc < Number(rule.value);
        if (rule.op === "gt") return pc > Number(rule.value);
        if (rule.op === "lte") return pc <= Number(rule.value);
        return true;
      });
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
