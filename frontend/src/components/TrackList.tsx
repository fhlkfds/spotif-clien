import { useCallback } from "react";
import { Play, Download, Clock } from "lucide-react";
import type { SpotifyTrack } from "../types";
import { useStore } from "../store/useStore";
import { spotify, downloads } from "../api/client";

interface TrackListProps {
  tracks: SpotifyTrack[];
  contextUri?: string;
  showAlbum?: boolean;
  showIndex?: boolean;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function TrackList({
  tracks,
  contextUri,
  showAlbum = true,
  showIndex = true,
}: TrackListProps) {
  const { playbackState, deviceId } = useStore();
  const currentId = playbackState?.item?.id;

  const playTrack = useCallback(
    async (track: SpotifyTrack, index: number) => {
      await spotify.play(
        contextUri
          ? { context_uri: contextUri, offset: { position: index } }
          : { uris: [track.uri] },
        deviceId ?? undefined
      );
    },
    [contextUri, deviceId]
  );

  const downloadTrack = useCallback(async (track: SpotifyTrack) => {
    await downloads.start({
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artists.map((a) => a.name).join(", "),
    });
    alert(`Download started: ${track.name}`);
  }, []);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showIndex
            ? `${showAlbum ? "36px 4fr 3fr 2fr 1fr" : "36px 4fr 2fr 1fr"}`
            : `${showAlbum ? "4fr 3fr 2fr 1fr" : "4fr 2fr 1fr"}`,
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {showIndex && <span>#</span>}
        <span>Title</span>
        {showAlbum && <span>Album</span>}
        <span>Artist</span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          <Clock size={14} />
        </span>
      </div>

      {tracks.map((track, idx) => {
        const isActive = track.id === currentId;
        return (
          <div
            key={`${track.id}-${idx}`}
            className="track-row"
            style={{
              display: "grid",
              gridTemplateColumns: showIndex
                ? `${showAlbum ? "36px 4fr 3fr 2fr 1fr" : "36px 4fr 2fr 1fr"}`
                : `${showAlbum ? "4fr 3fr 2fr 1fr" : "4fr 2fr 1fr"}`,
              alignItems: "center",
              gap: 8,
              color: isActive ? "var(--accent)" : "var(--text-primary)",
            }}
            onDoubleClick={() => playTrack(track, idx)}
          >
            {showIndex && (
              <div
                style={{ width: 36, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}
              >
                <span className="track-number">{idx + 1}</span>
                <button
                  className="btn-ghost track-play"
                  style={{ display: "none", padding: 0 }}
                  onClick={() => playTrack(track, idx)}
                >
                  <Play size={14} />
                </button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {track.album?.images?.[0]?.url && (
                <img
                  src={track.album.images[0].url}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div style={{ minWidth: 0 }}>
                <div
                  className="truncate"
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}
                >
                  {track.name}
                </div>
                {!showAlbum && (
                  <div className="truncate text-secondary" style={{ fontSize: 12 }}>
                    {track.artists.map((a) => a.name).join(", ")}
                  </div>
                )}
              </div>
            </div>

            {showAlbum && (
              <div className="truncate text-secondary" style={{ fontSize: 13 }}>
                {track.album?.name}
              </div>
            )}

            <div className="truncate text-secondary" style={{ fontSize: 13 }}>
              {track.artists.map((a) => a.name).join(", ")}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                className="btn-ghost"
                style={{ padding: 4, opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadTrack(track);
                }}
                title="Download"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <Download size={14} />
              </button>
              <span
                className="text-secondary"
                style={{ fontSize: 13, whiteSpace: "nowrap" }}
              >
                {formatDuration(track.duration_ms)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
