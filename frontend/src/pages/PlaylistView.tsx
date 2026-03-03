import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Play, Shuffle } from "lucide-react";
import { spotify } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import BookmarkButton from "../components/BookmarkButton";
import ShareMenu from "../components/ShareMenu";
import type { SpotifyPlaylist, SpotifyTrack } from "../types";

export default function PlaylistView() {
  const { id } = useParams<{ id: string }>();
  const { deviceId } = useStore();
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      spotify.getPlaylist(id),
      spotify.getPlaylistTracks(id),
    ])
      .then(([pl, tr]) => {
        setPlaylist(pl);
        setTracks(
          tr.items
            ?.filter((i: { track: SpotifyTrack | null }) => i.track)
            .map((i: { track: SpotifyTrack }) => i.track) ?? []
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!playlist) return null;

  const totalMin = Math.round(
    tracks.reduce((s, t) => s + t.duration_ms, 0) / 60000
  );

  return (
    <div>
      {/* Header */}
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
          src={playlist.images?.[0]?.url ?? ""}
          alt=""
          style={{ width: 200, height: 200, borderRadius: 4, objectFit: "cover", boxShadow: "var(--card-shadow)" }}
        />
        <div>
          <div className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Playlist
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 12, lineHeight: 1 }}>
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 8 }}
              dangerouslySetInnerHTML={{ __html: playlist.description }}
            />
          )}
          <div className="text-secondary" style={{ fontSize: 13 }}>
            {playlist.owner.display_name} · {tracks.length} songs,{" "}
            {totalMin} min
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="btn btn-primary"
          style={{ borderRadius: "50%", width: 56, height: 56, padding: 0, justifyContent: "center" }}
          onClick={() =>
            spotify.play(
              { context_uri: `spotify:playlist:${id}` },
              deviceId ?? undefined
            )
          }
        >
          <Play size={24} fill="currentColor" color="#000" />
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            spotify.shuffle(true);
            spotify.play({ context_uri: `spotify:playlist:${id}` }, deviceId ?? undefined);
          }}
        >
          <Shuffle size={22} />
        </button>
        <BookmarkButton
          type="playlist"
          item_id={playlist.id}
          item_name={playlist.name}
          item_uri={`spotify:playlist:${playlist.id}`}
        />
        <ShareMenu
          name={playlist.name}
          spotifyUri={`spotify:playlist:${playlist.id}`}
          spotifyUrl={`https://open.spotify.com/playlist/${playlist.id}`}
        />
      </div>

      <div style={{ padding: "0 24px 100px" }}>
        <TrackList
          tracks={tracks}
          contextUri={`spotify:playlist:${id}`}
          showAlbum
          showIndex
        />
      </div>
    </div>
  );
}
