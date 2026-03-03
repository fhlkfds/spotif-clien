import { Play, Pause, SkipForward, X, Maximize2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify } from "../api/client";

export default function MiniPlayer() {
  const {
    playbackState, deviceId,
    miniPlayerMode, setMiniPlayerMode,
    setNowPlayingOpen,
  } = useStore();

  if (!miniPlayerMode) return null;

  const track = playbackState?.item;
  const isPlaying = playbackState?.is_playing ?? false;
  const duration = track?.duration_ms ?? 0;
  const progress = playbackState?.progress_ms ?? 0;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1500,
        background: "var(--bg-elevated, var(--bg-secondary))",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        width: 280,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Progress stripe */}
      <div
        style={{
          height: 3,
          background: "var(--bg-tertiary)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            background: "var(--accent)",
            transition: "width 1s linear",
          }}
        />
      </div>

      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        {track?.album?.images?.[0]?.url ? (
          <img
            src={track.album.images[0].url}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 4, background: "var(--bg-tertiary)", flexShrink: 0 }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="truncate"
            style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onClick={() => setNowPlayingOpen(true)}
            title={track?.name}
          >
            {track?.name ?? "Nothing playing"}
          </div>
          <div className="truncate text-secondary" style={{ fontSize: 11 }}>
            {track?.artists?.map((a) => a.name).join(", ")}
          </div>
        </div>

        <button
          onClick={() => isPlaying ? spotify.pause() : spotify.play({}, deviceId ?? undefined)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-primary)", padding: 4, flexShrink: 0,
          }}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button
          onClick={() => spotify.next()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, flexShrink: 0 }}
        >
          <SkipForward size={16} />
        </button>
        <button
          onClick={() => setNowPlayingOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, flexShrink: 0 }}
          title="Expand"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={() => setMiniPlayerMode(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, flexShrink: 0 }}
          title="Close mini player"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
