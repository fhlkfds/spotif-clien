import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Download,
  Heart,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify, downloads } from "../api/client";
import { PluginSystem } from "../plugins/PluginSystem";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function Player() {
  const { playbackState, deviceId } = useStore();
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTrackId = useRef<string | null>(null);

  // Keep progress in sync
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (!playbackState) return;

    setProgress(playbackState.progress_ms);

    if (playbackState.is_playing) {
      progressInterval.current = setInterval(() => {
        setProgress((p) => Math.min(p + 1000, playbackState.item?.duration_ms ?? p));
      }, 1000);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [playbackState?.is_playing, playbackState?.progress_ms, playbackState?.item?.id]);

  // Emit plugin events on track change
  useEffect(() => {
    const track = playbackState?.item;
    if (track && track.id !== prevTrackId.current) {
      prevTrackId.current = track.id;
      PluginSystem.emit("track:change", track);
      PluginSystem.updatePlayerState(track, playbackState);
    }
  }, [playbackState?.item?.id]);

  const handlePlay = useCallback(async () => {
    if (!playbackState) return;
    if (playbackState.is_playing) {
      await spotify.pause();
    } else {
      await spotify.play({}, deviceId ?? undefined);
    }
  }, [playbackState, deviceId]);

  const handleSeek = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const ms = Math.floor(pct * (playbackState?.item?.duration_ms ?? 0));
      setProgress(ms);
      await spotify.seek(ms);
    },
    [playbackState?.item?.duration_ms]
  );

  const handleVolumeChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = Number(e.target.value);
      setVolume(vol);
      setIsMuted(vol === 0);
      await spotify.volume(vol);
    },
    []
  );

  const toggleMute = useCallback(async () => {
    const newVol = isMuted ? volume : 0;
    setIsMuted(!isMuted);
    await spotify.volume(newVol);
  }, [isMuted, volume]);

  const handleDownload = useCallback(async () => {
    const track = playbackState?.item;
    if (!track) return;
    await downloads.start({
      track_name: track.name,
      artist_name: track.artists.map((a) => a.name).join(", "),
      track_id: track.id,
      format: "mp3",
    });
    alert("Download started! Check Settings > Downloads");
  }, [playbackState?.item]);

  const track = playbackState?.item;
  const duration = track?.duration_ms ?? 0;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const isPlaying = playbackState?.is_playing ?? false;
  const isShuffle = playbackState?.shuffle_state ?? false;
  const repeatState = playbackState?.repeat_state ?? "off";

  return (
    <div
      className="player-bar"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr 1fr",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        height: "100%",
      }}
    >
      {/* Track info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {track?.album?.images?.[0]?.url ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            style={{ width: 56, height: 56, borderRadius: 4, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 4,
              background: "var(--bg-tertiary)",
            }}
          />
        )}
        {track && (
          <div style={{ minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>
              {track.name}
            </div>
            <div className="truncate text-secondary" style={{ fontSize: 12 }}>
              {track.artists.map((a) => a.name).join(", ")}
            </div>
          </div>
        )}
        {track && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button className="btn-ghost" style={{ padding: 4 }} title="Download">
              <Heart size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            className="btn-ghost"
            onClick={() => spotify.shuffle(!isShuffle)}
            style={{ color: isShuffle ? "var(--accent)" : "var(--text-secondary)" }}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>

          <button className="btn-ghost" onClick={() => spotify.previous()} title="Previous">
            <SkipBack size={22} />
          </button>

          <button
            onClick={handlePlay}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--text-primary)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg-primary)",
              transition: "transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button className="btn-ghost" onClick={() => spotify.next()} title="Next">
            <SkipForward size={22} />
          </button>

          <button
            className="btn-ghost"
            onClick={() => {
              const next =
                repeatState === "off"
                  ? "context"
                  : repeatState === "context"
                  ? "track"
                  : "off";
              spotify.repeat(next);
            }}
            style={{
              color: repeatState !== "off" ? "var(--accent)" : "var(--text-secondary)",
            }}
            title="Repeat"
          >
            {repeatState === "track" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 36, textAlign: "right" }}>
            {formatTime(progress)}
          </span>
          <div
            className="progress-bar"
            style={{ flex: 1, "--pct": `${pct}%` } as React.CSSProperties}
            onClick={handleSeek}
          >
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 36 }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume + extras */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
        {track && (
          <button className="btn-ghost" onClick={handleDownload} title="Download track">
            <Download size={18} />
          </button>
        )}

        <button className="btn-ghost" onClick={toggleMute}>
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          style={{
            width: 90,
            accentColor: "var(--accent)",
            background: "transparent",
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
}
