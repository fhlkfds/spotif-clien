import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { List, Grid, Search, SortAsc, Filter } from "lucide-react";
import { spotify } from "../api/client";
import type { SpotifyPlaylist, SpotifyTrack } from "../types";
import TrackList from "../components/TrackList";

type View = "playlists" | "tracks";
type SortKey = "default" | "name" | "artist" | "duration" | "popularity";

export default function Library() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDesc, setSortDesc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [yearFilter, setYearFilter] = useState("");
  const [minPopularity, setMinPopularity] = useState(0);

  useEffect(() => {
    setLoading(true);
    if (view === "playlists") {
      spotify.getPlaylists()
        .then((d) => setPlaylists(d.items ?? []))
        .finally(() => setLoading(false));
    } else {
      spotify.getSavedTracks(50, 0)
        .then((d) => setTracks(d.items?.map((i: { track: SpotifyTrack }) => i.track) ?? []))
        .finally(() => setLoading(false));
    }
  }, [view]);

  const filteredPlaylists = useMemo(() => {
    let list = playlists;
    if (searchQ) list = list.filter((p) => p.name.toLowerCase().includes(searchQ.toLowerCase()));
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return sortDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [playlists, searchQ, sortKey, sortDesc]);

  const filteredTracks = useMemo(() => {
    let list = tracks;
    if (searchQ) list = list.filter((t) =>
      t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.artists.some((a) => a.name.toLowerCase().includes(searchQ.toLowerCase())) ||
      t.album.name.toLowerCase().includes(searchQ.toLowerCase())
    );
    if (yearFilter) list = list.filter((t) => t.album.release_date?.startsWith(yearFilter));
    if (minPopularity > 0) list = list.filter((t) => (t.popularity ?? 0) >= minPopularity);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "artist") cmp = a.artists[0]?.name.localeCompare(b.artists[0]?.name ?? "") ?? 0;
      if (sortKey === "duration") cmp = a.duration_ms - b.duration_ms;
      if (sortKey === "popularity") cmp = (a.popularity ?? 0) - (b.popularity ?? 0);
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [tracks, searchQ, sortKey, sortDesc, yearFilter, minPopularity]);

  const TRACK_SORT_OPTS: { key: SortKey; label: string }[] = [
    { key: "default", label: "Default" },
    { key: "name", label: "Title" },
    { key: "artist", label: "Artist" },
    { key: "duration", label: "Duration" },
    { key: "popularity", label: "Popularity" },
  ];

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Your Library</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-ghost" onClick={() => setShowFilters(!showFilters)} title="Filters">
            <Filter size={18} style={{ color: showFilters ? "var(--accent)" : undefined }} />
          </button>
          <button className="btn-ghost" onClick={() => setLayoutMode(layoutMode === "grid" ? "list" : "grid")}>
            {layoutMode === "grid" ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="text"
          placeholder={`Search ${view === "playlists" ? "playlists" : "tracks"}…`}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          style={{ paddingLeft: 36, width: "100%", fontSize: 14 }}
        />
      </div>

      {/* Filters panel */}
      {showFilters && view === "tracks" && (
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}>
          <label style={{ fontSize: 13 }}>
            <span className="text-secondary" style={{ display: "block", marginBottom: 4 }}>Year</span>
            <input
              type="number"
              placeholder="e.g. 2020"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ width: 100, fontSize: 13 }}
              min={1950}
              max={2030}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            <span className="text-secondary" style={{ display: "block", marginBottom: 4 }}>Min Popularity: {minPopularity}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minPopularity}
              onChange={(e) => setMinPopularity(Number(e.target.value))}
              style={{ accentColor: "var(--accent)" }}
            />
          </label>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => { setYearFilter(""); setMinPopularity(0); }}>
            Reset
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["playlists", "tracks"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setLoading(true); setSortKey("default"); }}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: view === v ? "var(--text-primary)" : "var(--bg-tertiary)",
              color: view === v ? "var(--bg-primary)" : "var(--text-secondary)",
              textTransform: "capitalize",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Sort controls for tracks */}
      {view === "tracks" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          <SortAsc size={14} style={{ color: "var(--text-secondary)" }} />
          {TRACK_SORT_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { if (sortKey === key) setSortDesc(!sortDesc); else { setSortKey(key); setSortDesc(false); } }}
              style={{
                padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12,
                fontWeight: sortKey === key ? 700 : 400,
                background: sortKey === key ? "var(--accent)" : "var(--bg-tertiary)",
                color: sortKey === key ? "#000" : "var(--text-secondary)",
              }}
            >
              {label}{sortKey === key ? (sortDesc ? " ↓" : " ↑") : ""}
            </button>
          ))}
          <span className="text-muted" style={{ fontSize: 12 }}>
            {filteredTracks.length} of {tracks.length} tracks
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : view === "playlists" ? (
        layoutMode === "grid" ? (
          <div className="grid-cards">
            {filteredPlaylists.map((pl) => (
              <div key={pl.id} className="card" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <img
                  src={pl.images?.[0]?.url ?? ""}
                  alt=""
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4, marginBottom: 12 }}
                />
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{pl.name}</div>
                <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  Playlist · {pl.tracks.total} tracks
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filteredPlaylists.map((pl) => (
              <div
                key={pl.id}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 12px", borderRadius: 6, cursor: "pointer", transition: "background 0.15s" }}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <img src={pl.images?.[0]?.url ?? ""} alt="" style={{ width: 48, height: 48, borderRadius: 4, objectFit: "cover" }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{pl.name}</div>
                  <div className="text-secondary" style={{ fontSize: 12 }}>Playlist · {pl.tracks.total} tracks</div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <TrackList tracks={filteredTracks} showAlbum />
      )}
    </div>
  );
}
