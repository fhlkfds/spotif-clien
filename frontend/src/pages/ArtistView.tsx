import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { spotify } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import type { SpotifyArtist, SpotifyTrack, SpotifyAlbum } from "../types";

export default function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const { deviceId } = useStore();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      spotify.getArtist(id),
      spotify.getArtistTopTracks(id),
    ])
      .then(([a, tt]) => {
        setArtist(a);
        setTopTracks(tt.tracks ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }
  if (!artist) return null;

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          position: "relative",
          padding: "80px 24px 24px",
          background: "linear-gradient(to bottom, rgba(40,40,40,0.8), var(--bg-primary))",
          minHeight: 280,
          display: "flex",
          alignItems: "flex-end",
          gap: 24,
        }}
      >
        {artist.images?.[0]?.url && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${artist.images[0].url})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "brightness(0.4)",
              zIndex: 0,
            }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, color: "var(--text-secondary)" }}>
            Artist
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, marginBottom: 8, lineHeight: 1 }}>
            {artist.name}
          </h1>
          {artist.followers && (
            <div className="text-secondary" style={{ fontSize: 14 }}>
              {artist.followers.total.toLocaleString()} followers
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", gap: 16, alignItems: "center" }}>
        <button
          className="btn btn-primary"
          style={{ borderRadius: "50%", width: 56, height: 56, padding: 0, justifyContent: "center" }}
          onClick={() => spotify.play({ context_uri: `spotify:artist:${id}` }, deviceId ?? undefined)}
        >
          <Play size={24} fill="currentColor" color="#000" />
        </button>
      </div>

      <div style={{ padding: "0 24px 100px" }}>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Popular</h2>
        <TrackList tracks={topTracks} showAlbum showIndex={false} />
      </div>
    </div>
  );
}
