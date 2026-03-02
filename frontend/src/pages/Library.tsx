import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { List, Grid } from "lucide-react";
import { spotify } from "../api/client";
import type { SpotifyPlaylist, SpotifyTrack } from "../types";
import TrackList from "../components/TrackList";

type View = "playlists" | "tracks";

export default function Library() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (view === "playlists") {
      spotify.getPlaylists()
        .then((d) => setPlaylists(d.items ?? []))
        .finally(() => setLoading(false));
    } else {
      spotify.getSavedTracks()
        .then((d) => setTracks(d.items?.map((i: { track: SpotifyTrack }) => i.track) ?? []))
        .finally(() => setLoading(false));
    }
  }, [view]);

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Your Library</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-ghost"
            onClick={() => setLayoutMode(layoutMode === "grid" ? "list" : "grid")}
          >
            {layoutMode === "grid" ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["playlists", "tracks"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setLoading(true); }}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: view === v ? "var(--text-primary)" : "var(--bg-tertiary)",
              color: view === v ? "var(--bg-primary)" : "var(--text-secondary)",
              textTransform: "capitalize",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : view === "playlists" ? (
        layoutMode === "grid" ? (
          <div className="grid-cards">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="card"
                onClick={() => navigate(`/playlist/${pl.id}`)}
              >
                <img
                  src={pl.images?.[0]?.url ?? ""}
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
                  {pl.name}
                </div>
                <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  Playlist · {pl.tracks.total} tracks
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {playlists.map((pl) => (
              <div
                key={pl.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <img
                  src={pl.images?.[0]?.url ?? ""}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 4, objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{pl.name}</div>
                  <div className="text-secondary" style={{ fontSize: 12 }}>
                    Playlist · {pl.tracks.total} tracks
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <TrackList tracks={tracks} />
      )}
    </div>
  );
}
