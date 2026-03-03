import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { spotify } from "../api/client";

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  "Space": "Play / Pause",
  "n": "Next track",
  "p": "Previous track",
  "l": "Toggle Lyrics",
  "q": "Toggle Queue",
  "f": "Full-screen Now Playing",
  "m": "Toggle Mini Player",
  "ArrowUp": "Volume up",
  "ArrowDown": "Volume down",
  "?": "Show shortcuts",
};

export function useKeyboardShortcuts() {
  const {
    playbackState, deviceId,
    lyricsOpen, setLyricsOpen,
    queueOpen, setQueueOpen,
    nowPlayingOpen, setNowPlayingOpen,
    miniPlayerMode, setMiniPlayerMode,
    shortcutsOpen, setShortcutsOpen,
  } = useStore();

  useEffect(() => {
    let volumeRef = playbackState?.device?.volume_percent ?? 50;

    function handler(e: KeyboardEvent) {
      // Don't fire if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (playbackState?.is_playing) spotify.pause().catch(() => {});
          else spotify.play({}, deviceId ?? undefined).catch(() => {});
          break;

        case "n":
          e.preventDefault();
          spotify.next().catch(() => {});
          break;

        case "p":
          e.preventDefault();
          spotify.previous().catch(() => {});
          break;

        case "l":
          e.preventDefault();
          setLyricsOpen(!lyricsOpen);
          break;

        case "q":
          e.preventDefault();
          setQueueOpen(!queueOpen);
          break;

        case "f":
          e.preventDefault();
          setNowPlayingOpen(!nowPlayingOpen);
          break;

        case "m":
          e.preventDefault();
          setMiniPlayerMode(!miniPlayerMode);
          break;

        case "ArrowUp":
          if (!e.shiftKey) break;
          e.preventDefault();
          volumeRef = Math.min(100, volumeRef + 5);
          spotify.volume(volumeRef).catch(() => {});
          break;

        case "ArrowDown":
          if (!e.shiftKey) break;
          e.preventDefault();
          volumeRef = Math.max(0, volumeRef - 5);
          spotify.volume(volumeRef).catch(() => {});
          break;

        case "?":
          e.preventDefault();
          setShortcutsOpen(!shortcutsOpen);
          break;

        default:
          break;
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    playbackState, deviceId,
    lyricsOpen, queueOpen, nowPlayingOpen, miniPlayerMode, shortcutsOpen,
    setLyricsOpen, setQueueOpen, setNowPlayingOpen, setMiniPlayerMode, setShortcutsOpen,
  ]);
}
