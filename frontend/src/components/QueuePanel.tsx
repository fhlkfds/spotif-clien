import { useEffect, useState } from "react";
import { X, Play } from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify } from "../api/client";
import type { QueueState, SpotifyTrack } from "../types";

export default function QueuePanel() {
  const { queueOpen, setQueueOpen } = useStore();
  const [queueData, setQueueData] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!queueOpen) return;
    setLoading(true);
    spotify
      .getQueue()
      .then(setQueueData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [queueOpen]);

  if (!queueOpen) return null;

  function TrackRow({ track }: { track: SpotifyTrack }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 6,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <img
          src={track.album?.images?.[2]?.url ?? track.album?.images?.[0]?.url ?? ""}
          alt=""
          style={{ width: 36, height: 36, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{track.name}</div>
          <div className="truncate text-secondary" style={{ fontSize: 11 }}>
            {track.artists.map((a) => a.name).join(", ")}
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => spotify.play({ uris: [track.uri] })}
          style={{ padding: 4, flexShrink: 0 }}
          title="Play now"
        >
          <Play size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 80,
        width: 300,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 400,
        boxShadow: "-8px 0 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <h3 style={{ fontWeight: 700, fontSize: 16 }}>Queue</h3>
        <button className="btn-ghost" onClick={() => setQueueOpen(false)} style={{ padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && queueData && (
          <>
            {queueData.currently_playing && (
              <>
                <div style={{ padding: "10px 12px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Now Playing
                </div>
                <TrackRow track={queueData.currently_playing} />
              </>
            )}

            {queueData.queue.length > 0 && (
              <>
                <div style={{ padding: "10px 12px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Next up ({queueData.queue.length})
                </div>
                {queueData.queue.slice(0, 50).map((track, i) => (
                  <TrackRow key={`${track.id}-${i}`} track={track} />
                ))}
              </>
            )}

            {!queueData.currently_playing && queueData.queue.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 13 }}>
                Queue is empty
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
