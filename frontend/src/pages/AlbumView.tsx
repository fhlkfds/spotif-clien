import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play } from "lucide-react";
import { spotify } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import type { SpotifyAlbum, SpotifyTrack } from "../types";

export default function AlbumView() {
  const { id } = useParams<{ id: string }>();
  const { deviceId } = useStore();
  const [album, setAlbum] = useState<SpotifyAlbum & { tracks: { items: SpotifyTrack[] } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    spotify.getAlbum(id).then(setAlbum).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }
  if (!album) return null;

  return (
    <div>
      <div
        style={{
          padding: "80px 24px 24px",
          background: "linear-gradient(to bottom, rgba(80,80,80,0.5), var(--bg-primary))",
          display: "flex",
          gap: 24,
          alignItems: "flex-end",
        }}
      >
        <img
          src={album.images?.[0]?.url ?? ""}
          alt=""
          style={{ width: 200, height: 200, borderRadius: 4, objectFit: "cover", boxShadow: "var(--card-shadow)" }}
        />
        <div>
          <div className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Album
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
            {album.name}
          </h1>
          <div className="text-secondary" style={{ fontSize: 13 }}>
            {album.artists.map((a) => (
              <Link key={a.id} to={`/artist/${a.id}`} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {a.name}
              </Link>
            ))} · {album.release_date?.split("-")[0]} · {album.total_tracks} tracks
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        <button
          className="btn btn-primary"
          style={{ borderRadius: "50%", width: 56, height: 56, padding: 0, justifyContent: "center" }}
          onClick={() => spotify.play({ context_uri: `spotify:album:${id}` }, deviceId ?? undefined)}
        >
          <Play size={24} fill="currentColor" color="#000" />
        </button>
      </div>

      <div style={{ padding: "0 24px 100px" }}>
        <TrackList
          tracks={album.tracks.items}
          contextUri={`spotify:album:${id}`}
          showAlbum={false}
          showIndex
        />
      </div>
    </div>
  );
}
