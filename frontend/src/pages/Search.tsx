import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { spotify } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import ExternalLinks from "../components/ExternalLinks";
import type { SpotifyTrack, SpotifyAlbum, SpotifyArtist, SpotifyPlaylist } from "../types";

interface SearchResults {
  tracks?: { items: SpotifyTrack[] };
  albums?: { items: SpotifyAlbum[] };
  artists?: { items: SpotifyArtist[] };
  playlists?: { items: SpotifyPlaylist[] };
}

export default function Search() {
  const { deviceId } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [tab, setTab] = useState<"tracks" | "albums" | "artists" | "playlists">("tracks");
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults(null);
        setSubmittedQuery("");
        return;
      }
      setLoading(true);
      setSubmittedQuery(q.trim());
      try {
        const data = await spotify.search(q);
        setResults(data);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const tabs = ["tracks", "albums", "artists", "playlists"] as const;

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Search</h1>

      {/* Search input */}
      <div style={{ position: "relative", maxWidth: 480, marginBottom: 24 }}>
        <SearchIcon
          size={18}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-secondary)",
          }}
        />
        <input
          type="text"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
          style={{ paddingLeft: 40, borderRadius: 24 }}
        />
        <button
          onClick={() => handleSearch(query)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--accent)",
            border: "none",
            borderRadius: 16,
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "#000",
          }}
        >
          Search
        </button>
      </div>

      {/* External links shown after search */}
      {submittedQuery && (
        <div style={{ marginBottom: 24 }}>
          <ExternalLinks query={submittedQuery} />
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      )}

      {results && !loading && (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  background: tab === t ? "var(--text-primary)" : "var(--bg-tertiary)",
                  color: tab === t ? "var(--bg-primary)" : "var(--text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "tracks" && (
            <TrackList tracks={results.tracks?.items ?? []} showIndex={false} />
          )}

          {tab === "albums" && (
            <div className="grid-cards">
              {results.albums?.items.map((album) => (
                <div
                  key={album.id}
                  className="card"
                  onClick={() => navigate(`/album/${album.id}`)}
                >
                  <img
                    src={album.images?.[0]?.url ?? ""}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: 4,
                      marginBottom: 12,
                    }}
                  />
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                    {album.name}
                  </div>
                  <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                    {album.artists.map((a) => a.name).join(", ")} · {album.release_date?.split("-")[0]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "artists" && (
            <div className="grid-cards">
              {results.artists?.items.map((artist) => (
                <div
                  key={artist.id}
                  className="card"
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  style={{ textAlign: "center" }}
                >
                  <img
                    src={artist.images?.[0]?.url ?? ""}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: "50%",
                      marginBottom: 12,
                    }}
                  />
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                    {artist.name}
                  </div>
                  <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                    Artist
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "playlists" && (
            <div className="grid-cards">
              {results.playlists?.items.map((pl) => (
                <div
                  key={pl.id}
                  className="card"
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                >
                  <img
                    src={pl.images?.[0]?.url ?? ""}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: 4,
                      marginBottom: 12,
                    }}
                  />
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                    {pl.name}
                  </div>
                  <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                    By {pl.owner.display_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
