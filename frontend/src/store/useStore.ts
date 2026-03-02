import { create } from "zustand";
import type { PlaybackState, SpotifyTrack, SpotifyUser } from "../types";

interface AppStore {
  // Auth
  user: SpotifyUser | null;
  isPremium: boolean;
  isAuthenticated: boolean;
  setAuth: (user: SpotifyUser | null, isPremium: boolean) => void;

  // Player
  playbackState: PlaybackState | null;
  deviceId: string | null;
  queue: SpotifyTrack[];
  setPlaybackState: (state: PlaybackState | null) => void;
  setDeviceId: (id: string) => void;
  setQueue: (queue: SpotifyTrack[]) => void;

  // UI
  currentTheme: string;
  setTheme: (theme: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Now playing context
  contextUri: string | null;
  setContextUri: (uri: string | null) => void;
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
  queue: [],
  setPlaybackState: (playbackState) => set({ playbackState }),
  setDeviceId: (deviceId) => set({ deviceId }),
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
}));
