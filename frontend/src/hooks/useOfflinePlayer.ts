import { useRef, useCallback, useEffect } from "react";
import { useStore } from "../store/useStore";

/**
 * Manages an HTMLAudioElement for offline track playback.
 * When an offline track is set in the store, this hook drives playback.
 */
export function useOfflinePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { offlineTrackUrl, currentSource, setPlaybackState, playbackState, setOfflineTrack } = useStore();

  // Create audio element once
  if (!audioRef.current) {
    audioRef.current = new Audio();
  }

  // When offlineTrackUrl changes, load and play
  useEffect(() => {
    const audio = audioRef.current!;
    if (!offlineTrackUrl) {
      audio.pause();
      audio.src = "";
      return;
    }
    audio.src = offlineTrackUrl;
    audio.play().catch(() => {});
  }, [offlineTrackUrl]);

  // When Spotify resumes playing (source switches back), stop offline audio
  useEffect(() => {
    if (currentSource === "spotify" && audioRef.current) {
      audioRef.current.pause();
    }
  }, [currentSource]);

  const playOfflineTrack = useCallback((url: string) => {
    useStore.getState().setOfflineTrack(url);
  }, []);

  const pauseOffline = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resumeOffline = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const seekOffline = useCallback((ms: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
    }
  }, []);

  return { playOfflineTrack, pauseOffline, resumeOffline, seekOffline };
}
