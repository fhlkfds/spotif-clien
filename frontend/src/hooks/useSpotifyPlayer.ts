import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/useStore";
import { spotify } from "../api/client";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (state: unknown) => void) => boolean;
  removeListener: (event: string, cb?: (state: unknown) => void) => boolean;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  setVolume: (vol: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
}

interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { name: string; images: { url: string }[] };
      duration_ms: number;
      uri: string;
    };
    next_tracks: unknown[];
    previous_tracks: unknown[];
  };
  shuffle: boolean;
  repeat_mode: number;
  context: { uri: string; type: string } | null;
}

export function useSpotifyPlayer() {
  const { isPremium, setPlaybackState, setDeviceId } = useStore();
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const lastLoggedTrackId = useRef<string | null>(null);

  const initPlayer = useCallback(async () => {
    if (!isPremium) return;

    const { token } = await spotify.getSdkToken();

    const player = new window.Spotify.Player({
      name: "Spotify Client (Linux)",
      getOAuthToken: (cb) => cb(token),
      volume: 0.5,
    });

    player.addListener("ready", (state: unknown) => {
      const { device_id } = state as { device_id: string };
      console.log("Spotify SDK ready, device:", device_id);
      setDeviceId(device_id);
      // Transfer playback to this device
      spotify.transfer([device_id], false).catch(() => {});
    });

    player.addListener("player_state_changed", (state: unknown) => {
      const s = state as SpotifyPlayerState | null;
      if (!s) {
        setPlaybackState(null);
        return;
      }

      const track = s.track_window.current_track;
      setPlaybackState({
        is_playing: !s.paused,
        progress_ms: s.position,
        item: {
          id: track.id,
          name: track.name,
          artists: track.artists.map((a) => ({ id: "", ...a })),
          album: {
            id: "",
            name: track.album.name,
            images: track.album.images,
            artists: [],
            release_date: "",
            total_tracks: 0,
          },
          duration_ms: track.duration_ms,
          uri: track.uri,
          explicit: false,
        },
        device: null,
        shuffle_state: s.shuffle,
        repeat_state:
          s.repeat_mode === 0 ? "off" : s.repeat_mode === 1 ? "context" : "track",
        context: s.context,
      });

      // Log play to our stats DB when track changes
      if (track.id && track.id !== lastLoggedTrackId.current) {
        lastLoggedTrackId.current = track.id;
        spotify.logPlay({
          track_id: track.id,
          track_name: track.name,
          artist_name: track.artists.map((a) => a.name).join(", "),
          album_name: track.album.name,
          album_art: track.album.images[0]?.url,
          duration_ms: track.duration_ms,
        });
      }
    });

    player.addListener("not_ready", () => {
      console.log("Spotify SDK device offline");
    });

    await player.connect();
    playerRef.current = player;
  }, [isPremium, setDeviceId, setPlaybackState]);

  useEffect(() => {
    if (!isPremium) return;

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [isPremium, initPlayer]);

  return playerRef;
}
