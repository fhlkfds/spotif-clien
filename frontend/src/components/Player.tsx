import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
  Volume2, VolumeX,
  Download, Heart, Monitor,
  Mic2, List, WifiOff,
  Maximize2, Minimize2, PictureInPicture2,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify, downloads } from "../api/client";
import { PluginSystem } from "../plugins/PluginSystem";
import LyricsPanel from "./LyricsPanel";
import QueuePanel from "./QueuePanel";
import NowPlayingModal from "./NowPlayingModal";
import MiniPlayer from "./MiniPlayer";
import { useOfflinePlayer } from "../hooks/useOfflinePlayer";
import { usePiP } from "../hooks/usePiP";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function Player() {
  const {
    playbackState, deviceId, sdkConnected, isPremium,
    queueOpen, setQueueOpen, lyricsOpen, setLyricsOpen,
    nowPlayingOpen, setNowPlayingOpen,
    miniPlayerMode, setMiniPlayerMode,
    currentSource,
  } = useStore();
  const { pauseOffline, resumeOffline, seekOffline } = useOfflinePlayer();
  const { enterPiP, exitPiP, isPiP } = usePiP();

  const [sdkWarningDismissed, setSdkWarningDismissed] = useState(false);
  const [sdkTimeout, setSdkTimeout] = useState(false);
  useEffect(() => {
    if (!isPremium) return;
    const t = setTimeout(() => setSdkTimeout(true), 8000);
    return () => clearTimeout(t);
  }, [isPremium]);

  const showSdkWarning = isPremium && sdkTimeout && !sdkConnected && !sdkWarningDismissed;
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
      if (currentSource === "offline") {
        if (playbackState.is_playing) {
          pauseOffline();
        } else {
          resumeOffline();
        }
        return;
      }
      if (playbackState.is_playing) {
        await spotify.pause();
      } else {
        await spotify.play({}, deviceId ?? undefined);
      }
    } catch (e) {
      console.error("Play/pause failed:", e);
    }
  }, [playbackState, deviceId, currentSource, pauseOffline, resumeOffline]);

  const handleSeek = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ms = Math.floor(((e.clientX - rect.left) / rect.width) * (playbackState?.item?.duration_ms ?? 0));
    setProgress(ms);
    if (currentSource === "offline") {
      seekOffline(ms);
    } else {
      await spotify.seek(ms);
    }
  }, [playbackState?.item?.duration_ms, currentSource, seekOffline]);

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
    <>
      {showSdkWarning && (
        <div style={{
          position: "fixed",
          bottom: 96,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1a2e",
          border: "1px solid var(--warning, #e3a120)",
          borderRadius: 8,
          padding: "12px 16px",
          zIndex: 1000,
          maxWidth: 480,
          width: "calc(100% - 32px)",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <AlertTriangle size={18} color="var(--warning, #e3a120)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--warning, #e3a120)" }}>
              Browser player blocked
            </div>
            <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Your ad blocker is blocking Spotify's SDK connections.
              Disable it for this page (and whitelist <code style={{ background: "var(--bg-tertiary)", padding: "1px 4px", borderRadius: 3 }}>*.spotify.com</code>),
              then refresh.
            </div>
            <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}>
              You can still control playback from the Spotify app on another device.
            </div>
          </div>
          <button
            onClick={() => setSdkWarningDismissed(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Overlays */}
      <LyricsPanel />
      <QueuePanel />
      <NowPlayingModal />
      <MiniPlayer />

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
              onClick={() => setNowPlayingOpen(true)}
              title="Open full-screen player"
              style={{ width: 56, height: 56, borderRadius: 4, objectFit: "cover", flexShrink: 0, cursor: "pointer" }}
            />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 4, background: "var(--bg-tertiary)", flexShrink: 0 }} />
          )}
          {track && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>{track.name}</div>
                {currentSource === "offline" && (
                  <span
                    title="Playing offline"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: "var(--accent)", color: "#000",
                      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    <WifiOff size={9} /> OFFLINE
                  </span>
                )}
              </div>
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

        {/* Volume + device status + download + lyrics + queue */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          {/* Now playing fullscreen */}
          {track && (
            <button
              className="btn-ghost"
              onClick={() => setNowPlayingOpen(!nowPlayingOpen)}
              title="Full-screen player (F)"
              style={{ color: nowPlayingOpen ? "var(--accent)" : "var(--text-secondary)", padding: 4 }}
            >
              {nowPlayingOpen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Mini player toggle */}
          <button
            className="btn-ghost"
            onClick={() => setMiniPlayerMode(!miniPlayerMode)}
            title="Mini player (M)"
            style={{ color: miniPlayerMode ? "var(--accent)" : "var(--text-secondary)", padding: 4 }}
          >
            <PictureInPicture2 size={16} />
          </button>

          {/* PiP */}
          {track && (
            <button
              className="btn-ghost"
              onClick={() => isPiP ? exitPiP() : enterPiP()}
              title="Picture-in-Picture"
              style={{ color: isPiP ? "var(--accent)" : "var(--text-secondary)", padding: 4 }}
            >
              <PictureInPicture2 size={14} />
            </button>
          )}

          {/* Lyrics button */}
          {track && (
            <button
              className="btn-ghost"
              onClick={() => setLyricsOpen(!lyricsOpen)}
              title="Lyrics (L)"
              style={{ color: lyricsOpen ? "var(--accent)" : "var(--text-secondary)", padding: 4 }}
            >
              <Mic2 size={16} />
            </button>
          )}

          {/* Queue button */}
          <button
            className="btn-ghost"
            onClick={() => setQueueOpen(!queueOpen)}
            title="Queue (Q)"
            style={{ color: queueOpen ? "var(--accent)" : "var(--text-secondary)", padding: 4 }}
          >
            <List size={16} />
          </button>

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
    </>
  );
}
