import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { spotify } from "../api/client";
import { useStore } from "../store/useStore";
import type { SpotifyPlaylist, SpotifyTrack } from "../types";

interface RecentItem {
  track: SpotifyTrack;
  played_at: string;
}

export default function Home() {
  const { user, deviceId } = useStore();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      spotify.getPlaylists(),
      spotify.getRecentlyPlayed(),
      spotify.getTopItems("tracks", "short_term"),
    ])
      .then(([pl, recent, top]) => {
        setPlaylists(pl.items?.slice(0, 8) ?? []);
        setRecents(recent.items?.slice(0, 6) ?? []);
        setTopTracks(top.items?.slice(0, 6) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
        {greeting}, {user?.display_name?.split(" ")[0]}
      </h1>

      {/* Quick access - playlists grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {playlists.slice(0, 6).map((pl) => (
          <button
            key={pl.id}
            onClick={() => navigate(`/playlist/${pl.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-tertiary)",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              overflow: "hidden",
              transition: "background 0.2s",
              textAlign: "left",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget.style.background = "var(--bg-elevated)");
              const btn = e.currentTarget.querySelector<HTMLElement>(".play-btn");
              if (btn) btn.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.background = "var(--bg-tertiary)");
              const btn = e.currentTarget.querySelector<HTMLElement>(".play-btn");
              if (btn) btn.style.opacity = "0";
            }}
          >
            <img
              src={pl.images?.[0]?.url ?? ""}
              alt=""
              style={{ width: 64, height: 64, objectFit: "cover" }}
            />
            <span
              style={{
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {pl.name}
            </span>
            <button
              className="play-btn btn-primary"
              style={{
                position: "absolute",
                right: 12,
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s",
                border: "none",
                cursor: "pointer",
                background: "var(--accent)",
                boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                spotify.play({ context_uri: `spotify:playlist:${pl.id}` }, deviceId ?? undefined);
              }}
            >
              <Play size={16} fill="currentColor" color="#000" />
            </button>
          </button>
        ))}
      </div>

      {/* Recently played */}
      {recents.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
            Recently played
          </h2>
          <div className="grid-cards">
            {recents.map(({ track }) => (
              <div
                key={track.id}
                className="card"
                onDoubleClick={() =>
                  spotify.play({ uris: [track.uri] }, deviceId ?? undefined)
                }
              >
                <img
                  src={track.album?.images?.[0]?.url ?? ""}
                  alt=""
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 4,
                    marginBottom: 12,
                  }}
                />
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                  {track.name}
                </div>
                <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  {track.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top tracks this month */}
      {topTracks.length > 0 && (
        <section>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
            Your top tracks
          </h2>
          <div className="grid-cards">
            {topTracks.map((track) => (
              <div
                key={track.id}
                className="card"
                onDoubleClick={() =>
                  spotify.play({ uris: [track.uri] }, deviceId ?? undefined)
                }
              >
                <img
                  src={track.album?.images?.[0]?.url ?? ""}
                  alt=""
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 4,
                    marginBottom: 12,
                  }}
                />
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                  {track.name}
                </div>
                <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  {track.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
