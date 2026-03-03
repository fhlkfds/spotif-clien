import { Router, Request, Response } from "express";

export const lastfmRouter = Router();

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

async function lfmFetch(params: Record<string, string>): Promise<unknown> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("LASTFM_API_KEY not configured");
  const qs = new URLSearchParams({ ...params, api_key: apiKey, format: "json" });
  const res = await fetch(`${LASTFM_BASE}?${qs}`);
  if (!res.ok) throw new Error(`Last.fm ${res.status}`);
  return res.json();
}

lastfmRouter.get("/artist/:name/tags", async (req: Request, res: Response) => {
  try {
    const data = await lfmFetch({ method: "artist.getTopTags", artist: req.params.name });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/artist/:name/similar", async (req: Request, res: Response) => {
  try {
    const data = await lfmFetch({ method: "artist.getSimilar", artist: req.params.name, limit: "20" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/track/:artist/:track/tags", async (req: Request, res: Response) => {
  try {
    const data = await lfmFetch({ method: "track.getTopTags", artist: req.params.artist, track: req.params.track });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/track/:artist/:track/similar", async (req: Request, res: Response) => {
  try {
    const data = await lfmFetch({ method: "track.getSimilar", artist: req.params.artist, track: req.params.track, limit: "20" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/album/:artist/:album/tags", async (req: Request, res: Response) => {
  try {
    const data = await lfmFetch({ method: "album.getTopTags", artist: req.params.artist, album: req.params.album });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/tag/:tag/artists", async (req: Request, res: Response) => {
  try {
    const page = String(req.query.page ?? "1");
    const data = await lfmFetch({ method: "tag.getTopArtists", tag: req.params.tag, page });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/tag/:tag/albums", async (req: Request, res: Response) => {
  try {
    const page = String(req.query.page ?? "1");
    const data = await lfmFetch({ method: "tag.getTopAlbums", tag: req.params.tag, page });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/tag/:tag/tracks", async (req: Request, res: Response) => {
  try {
    const page = String(req.query.page ?? "1");
    const data = await lfmFetch({ method: "tag.getTopTracks", tag: req.params.tag, page });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/geo/top-artists", async (req: Request, res: Response) => {
  try {
    const country = String(req.query.country ?? "united states");
    const data = await lfmFetch({ method: "geo.getTopArtists", country });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

lastfmRouter.get("/geo/top-tracks", async (req: Request, res: Response) => {
  try {
    const country = String(req.query.country ?? "united states");
    const data = await lfmFetch({ method: "geo.getTopTracks", country });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
