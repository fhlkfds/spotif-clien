import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { spotify } from "../api/client";
import { PluginSystem } from "../plugins/PluginSystem";

const POLL_MS = 3000;

interface PrevTrack {
  id: string;
  progress_ms: number;
  duration_ms: number;
  startedAt: number;
}

/**
 * Polls the Spotify API for current playback state.
 * Detects skips and crossfades by tracking previous track progress.
 */
export function usePlaybackPoller() {
  const {
    isAuthenticated,
    setPlaybackState,
    sessionId,
    incrementSessionTrackCount,
    incrementSessionLoops,
  } = useStore();
  const prevTrackId = useRef<string | null>(null);
  const prevTrack = useRef<PrevTrack | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const state = await spotify.getPlayer();
        if (cancelled) return;

        setPlaybackState(state ?? null);

        const newTrackId = state?.item?.id ?? null;

        if (newTrackId && newTrackId !== prevTrackId.current) {
          const now = Date.now();
          const prev = prevTrack.current;

          // Detect skip / crossfade from previous track
          if (prev && prev.id !== newTrackId) {
            const playDuration = now - prev.startedAt;
            const pctPlayed = prev.duration_ms > 0
              ? prev.progress_ms / prev.duration_ms
              : 1;

            const skipped =
              pctPlayed < 0.80 &&
              playDuration < prev.duration_ms * 0.80;

            const crossfaded =
              pctPlayed > 0.88 &&
              (prev.duration_ms - prev.progress_ms) < 12_000;

            // Log previous track play
            if (prev.id) {
              spotify.logPlay({
                track_id: prev.id,
                track_name: state?.item?.name ?? "",
                artist_name: "",
                skipped,
                crossfaded,
                play_duration_ms: playDuration,
                session_id: sessionId,
              }).catch(() => {});
            }
          }

          // Detect loop (same track ID two consecutive polls)
          if (prevTrackId.current === newTrackId) {
            incrementSessionLoops();
          } else {
            incrementSessionTrackCount();
          }

          prevTrackId.current = newTrackId;
          prevTrack.current = {
            id: newTrackId,
            progress_ms: state?.progress_ms ?? 0,
            duration_ms: state?.item?.duration_ms ?? 0,
            startedAt: now,
          };

          PluginSystem.emit("track:change", state.item);
          PluginSystem.updatePlayerState(state.item, state);
        } else if (newTrackId && prevTrack.current) {
          // Update progress for skip detection accuracy
          prevTrack.current.progress_ms = state?.progress_ms ?? prevTrack.current.progress_ms;
        }
      } catch {
        // ignore transient errors
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, setPlaybackState, sessionId, incrementSessionTrackCount, incrementSessionLoops]);
}
