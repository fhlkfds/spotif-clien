import { Router, Request, Response } from "express";
import crypto from "crypto";

export const authRouter = Router();

const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-library-read",
  "user-library-modify",
  "streaming",
].join(" ");

authRouter.get("/login", (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state,
  });

  // Save session before redirect so oauthState is persisted in Redis
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).send("Session error");
    }
    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
  });
});

authRouter.get("/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost";

  if (error) {
    return res.redirect(`${frontendUrl}/?auth_error=${error}`);
  }

  if (state !== req.session.oauthState) {
    return res.redirect(`${frontendUrl}/?auth_error=state_mismatch`);
  }

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
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

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.statusText}`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Fetch user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id: string;
      display_name: string;
      email: string;
      images: { url: string }[];
      product: string;
    };

    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;
    req.session.userId = profile.id;
    req.session.spotifyUser = profile;
    delete req.session.oauthState;

    res.redirect(`${frontendUrl}/`);
  } catch (err) {
    console.error("Auth callback error:", err);
    res.redirect(`${frontendUrl}/?auth_error=server_error`);
  }
});

authRouter.get("/me", (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.session.spotifyUser,
    isPremium: req.session.spotifyUser?.product === "premium",
  });
});

authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Extend session type for oauth state
declare module "express-session" {
  interface SessionData {
    oauthState?: string;
  }
}
