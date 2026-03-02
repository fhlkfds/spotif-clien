import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

export const downloadsRouter = Router();
downloadsRouter.use(requireAuth);

const DOWNLOADS_PATH = process.env.DOWNLOADS_PATH ?? "./downloads";

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_PATH)) {
  fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });
}

// Active download progress map (in-memory)
const activeDownloads = new Map<string, { progress: number; status: string; error?: string }>();

// Start a download
downloadsRouter.post("/", async (req: Request, res: Response) => {
  const { track_name, artist_name, track_id, query, format = "mp3" } = req.body;

  if (!query && !track_name) {
    return res.status(400).json({ error: "query or track_name required" });
  }

  const searchQuery = query ?? `${artist_name} ${track_name} audio`;
  const downloadId = crypto.randomUUID();
  const safeFilename = `${track_id ?? downloadId}_${Date.now()}.%(ext)s`
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const outputPath = path.join(DOWNLOADS_PATH, safeFilename);

  // Insert pending record
  const { rows } = await pool.query(
    `INSERT INTO downloads (track_id, track_name, artist_name, file_path, format, user_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [track_id, track_name, artist_name, outputPath, format, req.session.userId]
  );
  const dbId = rows[0].id;

  activeDownloads.set(String(dbId), { progress: 0, status: "pending" });

  // Respond immediately with the download ID
  res.json({ id: dbId, status: "pending" });

  // Run yt-dlp in background
  const args = [
    `ytsearch1:${searchQuery}`,
    "--extract-audio",
    "--audio-format",
    format,
    "--audio-quality",
    "0",
    "--output",
    outputPath,
    "--no-playlist",
    "--newline",
  ];

  const proc = spawn("yt-dlp", args);
  let finalPath = "";

  proc.stdout.on("data", (data: Buffer) => {
    const line = data.toString();
    // Parse progress
    const pctMatch = line.match(/(\d+\.?\d*)%/);
    if (pctMatch) {
      activeDownloads.set(String(dbId), {
        progress: parseFloat(pctMatch[1]),
        status: "downloading",
      });
    }
    // Capture final filename
    const destMatch = line.match(/\[download\] Destination: (.+)/);
    if (destMatch) finalPath = destMatch[1].trim();
    const mergeMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
    if (mergeMatch) finalPath = mergeMatch[1].trim();
  });

  proc.on("close", async (code) => {
    if (code === 0) {
      try {
        const stat = fs.statSync(finalPath || outputPath.replace("%(ext)s", format));
        await pool.query(
          `UPDATE downloads SET status='completed', file_path=$1, file_size=$2 WHERE id=$3`,
          [finalPath || outputPath, stat.size, dbId]
        );
        activeDownloads.set(String(dbId), { progress: 100, status: "completed" });
      } catch {
        await pool.query(
          `UPDATE downloads SET status='completed' WHERE id=$1`,
          [dbId]
        );
        activeDownloads.set(String(dbId), { progress: 100, status: "completed" });
      }
    } else {
      await pool.query(
        `UPDATE downloads SET status='failed' WHERE id=$1`,
        [dbId]
      );
      activeDownloads.set(String(dbId), {
        progress: 0,
        status: "failed",
        error: "yt-dlp exited with error",
      });
    }

    // Clean up after 5 minutes
    setTimeout(() => activeDownloads.delete(String(dbId)), 5 * 60 * 1000);
  });
});

// Get download progress
downloadsRouter.get("/:id/progress", (req: Request, res: Response) => {
  const info = activeDownloads.get(req.params.id);
  if (!info) {
    return res.json({ progress: 100, status: "unknown" });
  }
  res.json(info);
});

// List downloads for user
downloadsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, track_id, track_name, artist_name, file_path, file_size, format, downloaded_at, status
       FROM downloads
       WHERE user_id = $1
       ORDER BY downloaded_at DESC
       LIMIT 100`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Delete a download
downloadsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM downloads WHERE id=$1 AND user_id=$2 RETURNING file_path`,
      [req.params.id, req.session.userId]
    );

    if (rows[0]?.file_path) {
      try {
        fs.unlinkSync(rows[0].file_path);
      } catch {
        // File may not exist, that's fine
      }
    }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// Serve file for download
downloadsRouter.get("/:id/file", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT file_path, track_name, artist_name FROM downloads WHERE id=$1 AND user_id=$2 AND status='completed'`,
      [req.params.id, req.session.userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Not found" });
    }

    const { file_path, track_name, artist_name } = rows[0];
    const ext = path.extname(file_path);
    res.download(file_path, `${artist_name} - ${track_name}${ext}`);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});
