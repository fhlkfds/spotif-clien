import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const userSettingsRouter = Router();
userSettingsRouter.use(requireAuth);

userSettingsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO user_settings (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.session.userId]
    );
    void rows;
    const { rows: settings } = await pool.query(
      "SELECT * FROM user_settings WHERE user_id=$1",
      [req.session.userId]
    );
    res.json(settings[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

userSettingsRouter.put("/", async (req: Request, res: Response) => {
  try {
    const { listening_mode, crossfade_ms, volume_normalize,
            custom_start_page, widgets, keyboard_shortcuts } = req.body;
    await pool.query(
      `INSERT INTO user_settings (user_id, listening_mode, crossfade_ms, volume_normalize,
         custom_start_page, widgets, keyboard_shortcuts, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         listening_mode = COALESCE($2, user_settings.listening_mode),
         crossfade_ms = COALESCE($3, user_settings.crossfade_ms),
         volume_normalize = COALESCE($4, user_settings.volume_normalize),
         custom_start_page = COALESCE($5, user_settings.custom_start_page),
         widgets = COALESCE($6, user_settings.widgets),
         keyboard_shortcuts = COALESCE($7, user_settings.keyboard_shortcuts),
         updated_at = NOW()`,
      [
        req.session.userId,
        listening_mode ?? null,
        crossfade_ms ?? null,
        volume_normalize ?? null,
        custom_start_page ?? null,
        widgets ? JSON.stringify(widgets) : null,
        keyboard_shortcuts ? JSON.stringify(keyboard_shortcuts) : null,
      ]
    );
    const { rows } = await pool.query(
      "SELECT * FROM user_settings WHERE user_id=$1",
      [req.session.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
