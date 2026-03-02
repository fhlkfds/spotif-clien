import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function refreshTokenIfNeeded(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.accessToken) return next();

  const expiresAt = req.session.tokenExpiresAt ?? 0;
  if (Date.now() < expiresAt - 60_000) return next();

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: req.session.refreshToken ?? "",
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: params.toString(),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      };
      req.session.accessToken = data.access_token;
      req.session.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      if (data.refresh_token) {
        req.session.refreshToken = data.refresh_token;
      }
    }
  } catch (err) {
    console.error("Token refresh failed:", err);
  }
  next();
}

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: number;
    spotifyUser: {
      id: string;
      display_name: string;
      email: string;
      images: { url: string }[];
      product: string;
    };
  }
}
