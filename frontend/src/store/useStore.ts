import { create } from "zustand";
import type { PlaybackState, SpotifyTrack, SpotifyUser } from "../types";

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface AppStore {
  // Auth
  user: SpotifyUser | null;
  isPremium: boolean;
  isAuthenticated: boolean;
  setAuth: (user: SpotifyUser | null, isPremium: boolean) => void;

  // Player
  playbackState: PlaybackState | null;
  deviceId: string | null;
  sdkConnected: boolean;
  queue: SpotifyTrack[];
  setPlaybackState: (state: PlaybackState | null) => void;
  setDeviceId: (id: string) => void;
  setSdkConnected: (v: boolean) => void;
  setQueue: (queue: SpotifyTrack[]) => void;

  // UI
  currentTheme: string;
  setTheme: (theme: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Now playing context
  contextUri: string | null;
  setContextUri: (uri: string | null) => void;

  // Queue panel
  queueOpen: boolean;
  setQueueOpen: (v: boolean) => void;

  // Lyrics panel
  lyricsOpen: boolean;
  setLyricsOpen: (v: boolean) => void;

  // Offline playback
  currentSource: "spotify" | "offline";
  offlineTrackUrl: string | null;
  setOfflineTrack: (url: string | null) => void;

  // Session tracking
  sessionId: string;
  sessionTrackCount: number;
  sessionLoops: number;
  sessionStartMs: number;
  incrementSessionTrackCount: () => void;
  incrementSessionLoops: () => void;
}

export const useStore = create<AppStore>((set) => ({
  // Auth
  user: null,
  isPremium: false,
  isAuthenticated: false,
  setAuth: (user, isPremium) =>
    set({ user, isPremium, isAuthenticated: user !== null }),

  // Player
  playbackState: null,
  deviceId: null,
  sdkConnected: false,
  queue: [],
  setPlaybackState: (playbackState) => set({ playbackState }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setSdkConnected: (sdkConnected) => set({ sdkConnected }),
  setQueue: (queue) => set({ queue }),

  // UI
  currentTheme: localStorage.getItem("theme") ?? "dark",
  setTheme: (currentTheme) => {
    localStorage.setItem("theme", currentTheme);
    set({ currentTheme });
  },
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  // Context
  contextUri: null,
  setContextUri: (contextUri) => set({ contextUri }),

  // Queue panel
  queueOpen: false,
  setQueueOpen: (queueOpen) => set({ queueOpen }),

  // Lyrics panel
  lyricsOpen: false,
  setLyricsOpen: (lyricsOpen) => set({ lyricsOpen }),

  // Offline playback
  currentSource: "spotify",
  offlineTrackUrl: null,
  setOfflineTrack: (url) =>
    set({ offlineTrackUrl: url, currentSource: url ? "offline" : "spotify" }),

  // Session tracking
  sessionId: generateSessionId(),
  sessionTrackCount: 0,
  sessionLoops: 0,
  sessionStartMs: Date.now(),
  incrementSessionTrackCount: () =>
    set((s) => ({ sessionTrackCount: s.sessionTrackCount + 1 })),
  incrementSessionLoops: () =>
    set((s) => ({ sessionLoops: s.sessionLoops + 1 })),
}));
