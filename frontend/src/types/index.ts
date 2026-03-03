export interface SpotifyImage {
  url: string;
  width?: number;
  height?: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  followers?: { total: number };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: SpotifyArtist[];
  release_date: string;
  total_tracks: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
  preview_url?: string | null;
  explicit: boolean;
  popularity?: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: { display_name: string };
  tracks: { total: number };
  public: boolean;
}

export interface PlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device: {
    id: string;
    name: string;
    volume_percent: number;
    is_active: boolean;
  } | null;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
  context?: {
    type: string;
    uri: string;
  } | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
  product: string;
}

export interface ThemeInfo {
  name: string;
  label: string;
  builtin: boolean;
}

export interface PluginInfo {
  name: string;
  description: string;
  version: string;
  author: string;
}

export interface Download {
  id: number;
  track_id: string | null;
  track_name: string;
  artist_name: string;
  file_path: string;
  file_size: number | null;
  format: string;
  downloaded_at: string;
  status: "pending" | "downloading" | "completed" | "failed";
}

export interface StatsOverview {
  totalPlays: number;
  totalMinutes: number;
  uniqueTracks: number;
  uniqueArtists: number;
  playsToday: number;
  playsThisWeek: number;
  playsThisMonth: number;
}

export interface TopTrack {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_art: string;
  play_count: string;
  total_ms: string;
}

export interface TopArtist {
  artist_name: string;
  play_count: string;
  unique_tracks: string;
  total_ms: string;
}

export interface ActivityDay {
  date: string;
  plays: string;
}

export interface Bookmark {
  id: number;
  type: string;
  item_id: string;
  item_name: string;
  item_uri?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LyricsData {
  synced_lyrics?: string;
  plain_lyrics?: string;
  source: string;
}

export interface QueueState {
  currently_playing: SpotifyTrack | null;
  queue: SpotifyTrack[];
}

export interface LastFmTag {
  name: string;
  url: string;
  count?: number;
}

export interface LastFmArtist {
  name: string;
  url: string;
  image?: { "#text": string; size: string }[];
}

export interface NewRelease {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
}

export interface OfflineTrack extends Download {
  file_url: string;
}

export interface AudioFeatures {
  track_id?: string;
  id?: string;
  danceability: number;   // 0-1
  energy: number;         // 0-1
  key: number;            // 0-11
  loudness: number;       // dB
  mode: number;           // 0=minor 1=major
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;        // 0-1 positivity
  tempo: number;          // BPM
  time_signature: number;
}

export type SmartPlaylistRule =
  | { field: "play_count"; op: "lt" | "gt" | "lte" | "gte"; value: number }
  | { field: "energy" | "valence" | "tempo" | "danceability" | "acousticness"; op: "lt" | "gt"; value: number }
  | { field: "liked_within_days"; op: "eq"; value: number }
  | { field: "skipped"; op: "eq"; value: boolean };

export interface SmartPlaylist {
  id: number;
  name: string;
  description: string;
  rules: SmartPlaylistRule[];
  created_at: string;
  updated_at: string;
}

export interface PinnedItem {
  id: number;
  type: "artist" | "playlist" | "album";
  item_id: string;
  item_name: string;
  metadata?: Record<string, unknown>;
  position: number;
}

export type ListeningMode = "normal" | "focus" | "gym" | "driving" | "sleep";

export interface UserSettings {
  user_id: string;
  listening_mode: ListeningMode;
  crossfade_ms: number;
  volume_normalize: boolean;
  custom_start_page: string;
  widgets: string[];
  keyboard_shortcuts: Record<string, string>;
  updated_at: string;
}

export interface PlaylistInsights {
  trackCount: number;
  totalDuration: number;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgDanceability: number;
  topArtists: { name: string; count: number }[];
  moodLabel: string;
  energyLabel: string;
  artistDiversity: number;
}
