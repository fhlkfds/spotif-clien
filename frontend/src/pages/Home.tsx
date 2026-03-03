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

function TrackCard({ track }: { track: SpotifyTrack }) {
  const { deviceId } = useStore();
  return (
    <div
      className="card"
      style={{ position: "relative" }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget.querySelector<HTMLElement>(".card-play");
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget.querySelector<HTMLElement>(".card-play");
        if (btn) btn.style.opacity = "0";
      }}
    >
      <div style={{ position: "relative", marginBottom: 12 }}>
        <img
          src={track.album?.images?.[0]?.url ?? ""}
          alt=""
          style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4 }}
        />
        <button
          className="card-play btn-primary btn"
          onClick={() => spotify.play({ uris: [track.uri] }, deviceId ?? undefined)}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 40,
            height: 40,
            borderRadius: "50%",
            padding: 0,
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.2s, transform 0.1s",
            boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
            border: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Play size={18} fill="currentColor" color="#000" />
        </button>
      </div>
      <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{track.name}</div>
      <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
        {track.artists.map((a) => a.name).join(", ")}
      </div>
    </div>
  );
}

function PlaylistChip({ pl }: { pl: SpotifyPlaylist }) {
  const { deviceId } = useStore();
  const navigate = useNavigate();
  return (
    <button
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
        e.currentTarget.style.background = "var(--bg-elevated)";
        const btn = e.currentTarget.querySelector<HTMLElement>(".chip-play");
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-tertiary)";
        const btn = e.currentTarget.querySelector<HTMLElement>(".chip-play");
        if (btn) btn.style.opacity = "0";
      }}
    >
      <img src={pl.images?.[0]?.url ?? ""} alt="" style={{ width: 64, height: 64, objectFit: "cover", flexShrink: 0 }} />
      <span style={{ padding: "0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
        {pl.name}
      </span>
      <button
        className="chip-play btn-primary"
        style={{
          position: "absolute", right: 12,
          width: 36, height: 36, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0, transition: "opacity 0.2s",
          border: "none", cursor: "pointer",
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
  );
}

export default function Home() {
  const { user } = useStore();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [recommended, setRecommended] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      spotify.getPlaylists(),
      spotify.getRecentlyPlayed(),
      spotify.getTopItems("tracks", "short_term"),
    ])
      .then(async ([pl, recent, top]) => {
        setPlaylists(pl.items?.slice(0, 6) ?? []);
        setRecents(recent.items?.slice(0, 6) ?? []);

        // Fetch recommendations seeded from top 5 tracks
        const seedTracks = (top.items as SpotifyTrack[])
          .slice(0, 5)
          .map((t) => t.id)
          .join(",");

        if (seedTracks) {
          try {
            const recs = await spotify.getRecommendations({ seed_tracks: seedTracks, limit: "12" });
            setRecommended(recs.tracks ?? []);
          } catch {
            // recommendations may fail for some account types
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
        {greeting}{user?.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}
      </h1>

      {/* Quick-access playlist chips */}
      {playlists.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 8,
            marginBottom: 40,
          }}
        >
          {playlists.map((pl) => <PlaylistChip key={pl.id} pl={pl} />)}
        </div>
      )}

      {/* Recently played */}
      {recents.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Recently played</h2>
          <div className="grid-cards">
            {recents.map(({ track }, i) => <TrackCard key={`${track.id}-${i}`} track={track} />)}
          </div>
        </section>
      )}

      {/* Recommendations based on your taste */}
      {recommended.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Recommended for you</h2>
          <p className="text-secondary" style={{ fontSize: 13, marginBottom: 16 }}>
            Based on your recent listening
          </p>
          <div className="grid-cards">
            {recommended.map((track) => <TrackCard key={track.id} track={track} />)}
          </div>
        </section>
      )}
    </div>
  );
}
