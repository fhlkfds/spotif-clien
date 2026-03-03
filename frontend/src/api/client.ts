import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const spotify = {
  search: (q: string, type = "track,album,artist,playlist") =>
    api.get("/spotify/search", { params: { q, type } }).then((r) => r.data),

  getPlayer: () => api.get("/spotify/player").then((r) => r.data),
  getSdkToken: () => api.get("/spotify/sdk-token").then((r) => r.data),

  play: (body?: object, deviceId?: string) =>
    api.post("/spotify/player/play", body ?? {}, {
      params: deviceId ? { device_id: deviceId } : {},
    }),
  pause: () => api.post("/spotify/player/pause"),
  next: () => api.post("/spotify/player/next"),
  previous: () => api.post("/spotify/player/previous"),
  seek: (position_ms: number) => api.post("/spotify/player/seek", { position_ms }),
  volume: (volume_percent: number) => api.post("/spotify/player/volume", { volume_percent }),
  shuffle: (state: boolean) => api.post("/spotify/player/shuffle", { state }),
  repeat: (state: "off" | "track" | "context") =>
    api.post("/spotify/player/repeat", { state }),
  transfer: (deviceIds: string[], play = false) =>
    api.post("/spotify/player/transfer", { device_ids: deviceIds, play }),

  logPlay: (track: {
    track_id: string;
    track_name: string;
    artist_name: string;
    album_name?: string;
    album_art?: string;
    duration_ms?: number;
  }) => api.post("/spotify/player/log", track),

  getPlaylists: () => api.get("/spotify/me/playlists").then((r) => r.data),
  getSavedTracks: (limit = 50, offset = 0) =>
    api.get("/spotify/me/tracks", { params: { limit, offset } }).then((r) => r.data),
  getTopItems: (type: "tracks" | "artists", timeRange = "medium_term") =>
    api.get(`/spotify/me/top/${type}`, { params: { time_range: timeRange, limit: 50 } }).then((r) => r.data),
  getRecentlyPlayed: () => api.get("/spotify/me/recently-played").then((r) => r.data),

  getPlaylist: (id: string) => api.get(`/spotify/playlists/${id}`).then((r) => r.data),
  getPlaylistTracks: (id: string, offset = 0) =>
    api.get(`/spotify/playlists/${id}/tracks`, { params: { limit: 100, offset } }).then((r) => r.data),

  getAlbum: (id: string) => api.get(`/spotify/albums/${id}`).then((r) => r.data),
  getArtist: (id: string) => api.get(`/spotify/artists/${id}`).then((r) => r.data),
  getArtistTopTracks: (id: string) =>
    api.get(`/spotify/artists/${id}/top-tracks`).then((r) => r.data),

  getRecommendations: (params: Record<string, string>) =>
    api.get("/spotify/recommendations", { params }).then((r) => r.data),

  createPlaylist: (userId: string, name: string, description = "") =>
    api.post(`/spotify/users/${userId}/playlists`, { name, description, public: false }).then((r) => r.data),

  checkSaved: (ids: string[]) =>
    api.get("/spotify/me/tracks/contains", { params: { ids: ids.join(",") } }).then((r) => r.data as boolean[]),
  saveTrack: (id: string) => api.put("/spotify/me/tracks", { ids: [id] }),
  removeTrack: (id: string) => api.delete("/spotify/me/tracks", { data: { ids: [id] } }),

  getDevices: () => api.get("/spotify/devices").then((r) => r.data),
};

export const auth = {
  getMe: () => api.get("/auth/me").then((r) => r.data),
  logout: () => api.post("/auth/logout"),
};

export const stats = {
  getOverview: () => api.get("/stats/overview").then((r) => r.data),
  getTopTracks: (period = "all") =>
    api.get("/stats/top-tracks", { params: { period } }).then((r) => r.data),
  getTopArtists: (period = "all") =>
    api.get("/stats/top-artists", { params: { period } }).then((r) => r.data),
  getActivity: () => api.get("/stats/activity").then((r) => r.data),
  getByHour: () => api.get("/stats/by-hour").then((r) => r.data),
  getHistory: (limit = 50, offset = 0) =>
    api.get("/stats/history", { params: { limit, offset } }).then((r) => r.data),
  getStreaks: () => api.get("/stats/streaks").then((r) => r.data),
};

export const downloads = {
  start: (data: {
    track_name: string;
    artist_name: string;
    track_id?: string;
    query?: string;
    format?: string;
  }) => api.post("/downloads", data).then((r) => r.data),
  getProgress: (id: number) =>
    api.get(`/downloads/${id}/progress`).then((r) => r.data),
  list: () => api.get("/downloads").then((r) => r.data),
  delete: (id: number) => api.delete(`/downloads/${id}`),
  fileUrl: (id: number) => `/api/downloads/${id}/file`,
};

export const themes = {
  list: () => api.get("/themes").then((r) => r.data),
  getCurrent: () => api.get("/themes/current").then((r) => r.data),
  setCurrent: (theme_name: string, custom_css?: string) =>
    api.post("/themes/current", { theme_name, custom_css }),
  upload: (name: string, css: string) =>
    api.post("/themes/upload", { name, css }),
};

export const plugins = {
  listAvailable: () => api.get("/plugins/available").then((r) => r.data),
  list: () => api.get("/plugins").then((r) => r.data),
  toggle: (name: string, enabled: boolean) =>
    api.post(`/plugins/${name}/toggle`, { enabled }),
  updateConfig: (name: string, config: object) =>
    api.put(`/plugins/${name}/config`, { config }),
  bundleUrl: (name: string) => `/api/plugins/${name}/bundle.js`,
};

export default api;
