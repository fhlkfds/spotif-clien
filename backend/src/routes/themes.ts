import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const themesRouter = Router();

// In prod: __dirname is dist/routes/, so ../../themes = backend/themes
// THEMES_PATH env var can override for Docker volume mounts
const THEMES_PATH = process.env.THEMES_PATH ?? path.join(__dirname, "../../themes-user");
const BUILTIN_THEMES_PATH = path.join(__dirname, "../../themes");

// List all available themes (built-in + user-uploaded)
themesRouter.get("/", (req: Request, res: Response) => {
  const themes: { name: string; label: string; builtin: boolean }[] = [];

  // Built-in themes
  const builtins = [
    { name: "dark", label: "Dark" },
    { name: "light", label: "Light" },
    { name: "dracula", label: "Dracula" },
    { name: "nord", label: "Nord" },
    { name: "catppuccin", label: "Catppuccin Mocha" },
    { name: "gruvbox", label: "Gruvbox" },
    { name: "solarized", label: "Solarized Dark" },
  ];
  themes.push(...builtins.map((t) => ({ ...t, builtin: true })));

  // User themes from disk
  if (fs.existsSync(THEMES_PATH)) {
    const files = fs.readdirSync(THEMES_PATH).filter((f) => f.endsWith(".css"));
    for (const file of files) {
      const name = file.replace(".css", "");
      if (!themes.find((t) => t.name === name)) {
        themes.push({ name, label: name, builtin: false });
      }
    }
  }

  res.json(themes);
});

// Serve built-in theme CSS
themesRouter.get("/builtin/:name", (req: Request, res: Response) => {
  const cssPath = path.join(BUILTIN_THEMES_PATH, `${req.params.name}.css`);
  if (!fs.existsSync(cssPath)) {
    return res.status(404).json({ error: "Theme not found" });
  }
  res.setHeader("Content-Type", "text/css");
  res.sendFile(cssPath);
});

// Serve user theme CSS
themesRouter.get("/user/:name", (req: Request, res: Response) => {
  const cssPath = path.join(THEMES_PATH, `${req.params.name}.css`);
  if (!fs.existsSync(cssPath)) {
    return res.status(404).json({ error: "Theme not found" });
  }
  res.setHeader("Content-Type", "text/css");
  res.sendFile(cssPath);
});

// Get user's current theme
themesRouter.get("/current", requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT theme_name, custom_css FROM user_themes WHERE user_id=$1`,
    [req.session.userId]
  );
  res.json(rows[0] ?? { theme_name: "dark", custom_css: null });
});

// Set user's theme
themesRouter.post("/current", requireAuth, async (req: Request, res: Response) => {
  const { theme_name, custom_css } = req.body;
  await pool.query(
    `INSERT INTO user_themes (user_id, theme_name, custom_css, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET theme_name=EXCLUDED.theme_name, custom_css=EXCLUDED.custom_css, updated_at=NOW()`,
    [req.session.userId, theme_name, custom_css ?? null]
  );
  res.json({ success: true });
});

// Upload custom theme
themesRouter.post("/upload", requireAuth, async (req: Request, res: Response) => {
  const { name, css } = req.body;
  if (!name || !css) {
    return res.status(400).json({ error: "name and css required" });
  }

  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, "_");
  if (!fs.existsSync(THEMES_PATH)) {
    fs.mkdirSync(THEMES_PATH, { recursive: true });
  }

  fs.writeFileSync(path.join(THEMES_PATH, `${safeName}.css`), css, "utf-8");
  res.json({ success: true, name: safeName });
});
