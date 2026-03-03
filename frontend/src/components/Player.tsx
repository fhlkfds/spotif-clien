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
  Monitor,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify, downloads } from "../api/client";
import { PluginSystem } from "../plugins/PluginSystem";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function Player() {
  const { playbackState, deviceId } = useStore();
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTrackId = useRef<string | null>(null);

  // Sync progress bar
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (!playbackState) return;
    setProgress(playbackState.progress_ms);
    if (playbackState.is_playing) {
      progressInterval.current = setInterval(() => {
        setProgress((p) => Math.min(p + 1000, playbackState.item?.duration_ms ?? p));
      }, 1000);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [playbackState?.is_playing, playbackState?.progress_ms, playbackState?.item?.id]);

  // Check liked state when track changes
  useEffect(() => {
    const track = playbackState?.item;
    if (!track || track.id === prevTrackId.current) return;
    prevTrackId.current = track.id;
    PluginSystem.emit("track:change", track);
    PluginSystem.updatePlayerState(track, playbackState);

    spotify.checkSaved([track.id])
      .then(([saved]) => setIsLiked(saved))
      .catch(() => {});
  }, [playbackState?.item?.id]);

  const handlePlay = useCallback(async () => {
    if (!playbackState) return;
    try {
      if (playbackState.is_playing) {
        await spotify.pause();
      } else {
        await spotify.play({}, deviceId ?? undefined);
      }
    } catch (e) {
      console.error("Play/pause failed:", e);
    }
  }, [playbackState, deviceId]);

  const handleSeek = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ms = Math.floor(((e.clientX - rect.left) / rect.width) * (playbackState?.item?.duration_ms ?? 0));
    setProgress(ms);
    await spotify.seek(ms);
  }, [playbackState?.item?.duration_ms]);

  const handleVolumeChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    await spotify.volume(vol);
  }, []);

  const toggleMute = useCallback(async () => {
    const newVol = isMuted ? volume : 0;
    setIsMuted(!isMuted);
    await spotify.volume(newVol);
  }, [isMuted, volume]);

  const toggleLike = useCallback(async () => {
    const track = playbackState?.item;
    if (!track || likeLoading) return;
    setLikeLoading(true);
    try {
      if (isLiked) {
        await spotify.removeTrack(track.id);
        setIsLiked(false);
      } else {
        await spotify.saveTrack(track.id);
        setIsLiked(true);
      }
    } catch (e) {
      console.error("Like toggle failed:", e);
    } finally {
      setLikeLoading(false);
    }
  }, [playbackState?.item, isLiked, likeLoading]);

  const handleDownload = useCallback(async () => {
    const track = playbackState?.item;
    if (!track) return;
    try {
      await downloads.start({
        track_name: track.name,
        artist_name: track.artists.map((a) => a.name).join(", "),
        track_id: track.id,
        format: "mp3",
      });
      alert("Download queued — check Settings → Downloads");
    } catch {
      alert("Download failed");
    }
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
      {/* Track info + like */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {track?.album?.images?.[0]?.url ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            style={{ width: 56, height: 56, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 4, background: "var(--bg-tertiary)", flexShrink: 0 }} />
        )}
        {track && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>{track.name}</div>
            <div className="truncate text-secondary" style={{ fontSize: 12 }}>
              {track.artists.map((a) => a.name).join(", ")}
            </div>
          </div>
        )}
        {track && (
          <button
            onClick={toggleLike}
            disabled={likeLoading}
            title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
            style={{
              background: "none",
              border: "none",
              cursor: likeLoading ? "not-allowed" : "pointer",
              padding: 4,
              color: isLiked ? "var(--accent)" : "var(--text-secondary)",
              transition: "color 0.15s, transform 0.1s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => !isLiked && (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => !isLiked && (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* Playback controls + progress */}
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
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--text-primary)", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: "var(--bg-primary)",
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
              const next = repeatState === "off" ? "context" : repeatState === "context" ? "track" : "off";
              spotify.repeat(next);
            }}
            style={{ color: repeatState !== "off" ? "var(--accent)" : "var(--text-secondary)" }}
            title="Repeat"
          >
            {repeatState === "track" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Progress bar */}
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

      {/* Volume + device status + download */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
        {/* Browser device indicator */}
        <div
          title={deviceId ? "Browser player ready" : "Browser player not connected"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: deviceId ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          <Monitor size={14} />
          <span style={{ display: "none" }}>Browser</span>
        </div>

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
          style={{ width: 80, accentColor: "var(--accent)", background: "transparent", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}
