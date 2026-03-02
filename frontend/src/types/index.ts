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
