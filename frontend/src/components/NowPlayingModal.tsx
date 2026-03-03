import { useEffect, useState } from "react";
import { X, Heart, Download, SkipBack, SkipForward, Play, Pause,
         Shuffle, Repeat, Repeat1, Volume2, ChevronDown, Mic2, List } from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify, downloads } from "../api/client";
import AudioFeaturesBar from "./AudioFeaturesBar";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function NowPlayingModal() {
  const {
    nowPlayingOpen, setNowPlayingOpen,
    playbackState, deviceId,
    lyricsOpen, setLyricsOpen,
    queueOpen, setQueueOpen,
  } = useStore();

  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);

  const track = playbackState?.item;

  useEffect(() => {
    if (!track) return;
    spotify.checkSaved([track.id]).then(([saved]) => setIsLiked(saved)).catch(() => {});
  }, [track?.id]);

  useEffect(() => {
    if (!playbackState) return;
    setProgress(playbackState.progress_ms);
    if (!playbackState.is_playing) return;
    const iv = setInterval(() => {
      setProgress((p) => Math.min(p + 1000, track?.duration_ms ?? p));
    }, 1000);
    return () => clearInterval(iv);
  }, [playbackState?.is_playing, playbackState?.progress_ms, track?.id]);

  if (!nowPlayingOpen) return null;

  const duration = track?.duration_ms ?? 0;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const isPlaying = playbackState?.is_playing ?? false;
  const isShuffle = playbackState?.shuffle_state ?? false;
  const repeatState = playbackState?.repeat_state ?? "off";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(40px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      {/* Background art blur */}
      {track?.album?.images?.[0]?.url && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${track.album.images[0].url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px) brightness(0.2)",
            transform: "scale(1.1)",
            zIndex: 0,
          }}
        />
      )}

      {/* Close */}
      <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10, display: "flex", gap: 8 }}>
        <button
          onClick={() => { setLyricsOpen(!lyricsOpen); }}
          style={{
            background: lyricsOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
            border: "none", borderRadius: "50%", width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-primary)",
          }}
          title="Lyrics"
        >
          <Mic2 size={18} />
        </button>
        <button
          onClick={() => { setQueueOpen(!queueOpen); }}
          style={{
            background: queueOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
            border: "none", borderRadius: "50%", width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-primary)",
          }}
          title="Queue"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => setNowPlayingOpen(false)}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none", borderRadius: "50%", width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-primary)",
          }}
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Big album art */}
        {track?.album?.images?.[0]?.url ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            style={{
              width: "min(360px, 70vw)",
              height: "min(360px, 70vw)",
              borderRadius: 12,
              objectFit: "cover",
              boxShadow: "0 32px 64px rgba(0,0,0,0.7)",
            }}
          />
        ) : (
          <div
            style={{
              width: 320, height: 320, borderRadius: 12,
              background: "var(--bg-secondary)",
            }}
          />
        )}

        {/* Track info */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
              {track?.name ?? "—"}
            </div>
            <div style={{ fontSize: 16, color: "var(--text-secondary)" }}>
              {track?.artists?.map((a) => a.name).join(", ")}
            </div>
            {track && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                {track.album.name}
              </div>
            )}
          </div>
          {track && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  if (!track) return;
                  if (isLiked) spotify.removeTrack(track.id).then(() => setIsLiked(false));
                  else spotify.saveTrack(track.id).then(() => setIsLiked(true));
                }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: isLiked ? "var(--accent)" : "var(--text-secondary)",
                  padding: 8,
                }}
              >
                <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={async () => {
                  if (!track) return;
                  await downloads.start({ track_name: track.name, artist_name: track.artists[0]?.name ?? "", track_id: track.id });
                  alert("Download queued");
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 8 }}
              >
                <Download size={22} />
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%" }}>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ms = Math.floor(((e.clientX - rect.left) / rect.width) * duration);
              setProgress(ms);
              spotify.seek(ms).catch(() => {});
            }}
            style={{
              width: "100%", height: 5, background: "rgba(255,255,255,0.15)",
              borderRadius: 3, cursor: "pointer", position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${pct}%`, background: "var(--text-primary)",
                borderRadius: 3, transition: "width 0.5s linear",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button
            onClick={() => spotify.shuffle(!isShuffle)}
            style={{ background: "none", border: "none", cursor: "pointer", color: isShuffle ? "var(--accent)" : "rgba(255,255,255,0.5)", padding: 8 }}
          >
            <Shuffle size={22} />
          </button>
          <button
            onClick={() => spotify.previous()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 8 }}
          >
            <SkipBack size={28} fill="currentColor" />
          </button>
          <button
            onClick={() => {
              if (isPlaying) spotify.pause();
              else spotify.play({}, deviceId ?? undefined);
            }}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--text-primary)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--bg-primary)",
            }}
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          <button
            onClick={() => spotify.next()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 8 }}
          >
            <SkipForward size={28} fill="currentColor" />
          </button>
          <button
            onClick={() => {
              const next = repeatState === "off" ? "context" : repeatState === "context" ? "track" : "off";
              spotify.repeat(next);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: repeatState !== "off" ? "var(--accent)" : "rgba(255,255,255,0.5)", padding: 8 }}
          >
            {repeatState === "track" ? <Repeat1 size={22} /> : <Repeat size={22} />}
          </button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <Volume2 size={16} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
          <input
            type="range" min={0} max={100}
            defaultValue={playbackState?.device?.volume_percent ?? 50}
            onChange={(e) => spotify.volume(Number(e.target.value)).catch(() => {})}
            style={{ flex: 1, accentColor: "var(--text-primary)" }}
          />
        </div>

        {/* Audio features bar */}
        {track && <AudioFeaturesBar trackId={track.id} />}
      </div>

      {/* Close X (bottom) */}
      <button
        onClick={() => setNowPlayingOpen(false)}
        style={{
          position: "absolute", bottom: 24,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, zIndex: 10,
        }}
      >
        <X size={16} /> Close full screen
      </button>
    </div>
  );
}
