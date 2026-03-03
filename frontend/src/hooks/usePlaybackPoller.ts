import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { spotify } from "../api/client";
import { PluginSystem } from "../plugins/PluginSystem";

const POLL_MS = 3000;

/**
 * Polls the Spotify API for current playback state.
 * This ensures the player bar always reflects what's playing,
 * regardless of which device (browser SDK, phone, desktop app, etc).
 */
export function usePlaybackPoller() {
  const { isAuthenticated, setPlaybackState, playbackState } = useStore();
  const prevTrackId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const state = await spotify.getPlayer();
        if (!cancelled) {
          setPlaybackState(state ?? null);

          // Emit plugin event on track change
          const newTrackId = state?.item?.id ?? null;
          if (newTrackId && newTrackId !== prevTrackId.current) {
            prevTrackId.current = newTrackId;
            PluginSystem.emit("track:change", state.item);
            PluginSystem.updatePlayerState(state.item, state);
          }
        }
      } catch {
        // ignore transient errors
      }
    }

    // Poll immediately then on interval
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, setPlaybackState]);
}
