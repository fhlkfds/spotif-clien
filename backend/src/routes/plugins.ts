import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const pluginsRouter = Router();

const PLUGINS_PATH = process.env.PLUGINS_PATH ?? "./plugins";

// List available plugins (from disk)
pluginsRouter.get("/available", requireAuth, (req: Request, res: Response) => {
  const plugins: {
    name: string;
    description: string;
    version: string;
    author: string;
  }[] = [];

  if (!fs.existsSync(PLUGINS_PATH)) {
    return res.json(plugins);
  }

  const dirs = fs
    .readdirSync(PLUGINS_PATH, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const dir of dirs) {
    const manifestPath = path.join(PLUGINS_PATH, dir.name, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
          name: string;
          description: string;
          version: string;
          author: string;
        };
        plugins.push(manifest);
      } catch {
        // Skip malformed manifests
      }
    }
  }

  res.json(plugins);
});

// Get user's enabled plugins
pluginsRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT plugin_name, enabled, config FROM user_plugins WHERE user_id=$1`,
    [req.session.userId]
  );
  res.json(rows);
});

// Toggle plugin
pluginsRouter.post("/:name/toggle", requireAuth, async (req: Request, res: Response) => {
  const { enabled } = req.body;
  await pool.query(
    `INSERT INTO user_plugins (user_id, plugin_name, enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, plugin_name) DO UPDATE SET enabled=EXCLUDED.enabled`,
    [req.session.userId, req.params.name, enabled]
  );
  res.json({ success: true });
});

// Update plugin config
pluginsRouter.put("/:name/config", requireAuth, async (req: Request, res: Response) => {
  const { config } = req.body;
  await pool.query(
    `INSERT INTO user_plugins (user_id, plugin_name, enabled, config)
     VALUES ($1, $2, true, $3)
     ON CONFLICT (user_id, plugin_name) DO UPDATE SET config=EXCLUDED.config`,
    [req.session.userId, req.params.name, JSON.stringify(config)]
  );
  res.json({ success: true });
});

// Serve plugin JS bundle
pluginsRouter.get("/:name/bundle.js", (req: Request, res: Response) => {
  const bundlePath = path.join(PLUGINS_PATH, req.params.name, "bundle.js");
  if (!fs.existsSync(bundlePath)) {
    return res.status(404).json({ error: "Plugin not found" });
  }
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.resolve(bundlePath));
});
