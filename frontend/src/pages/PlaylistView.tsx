import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Play, Shuffle, TrendingUp, Trash2, PlusCircle, SortAsc, CheckSquare, Square,
} from "lucide-react";
import { spotify } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import BookmarkButton from "../components/BookmarkButton";
import ShareMenu from "../components/ShareMenu";
import PlaylistInsights from "../components/PlaylistInsights";
import type { SpotifyPlaylist, SpotifyTrack, AudioFeatures } from "../types";

type SortKey = "default" | "title" | "artist" | "album" | "duration" | "popularity" | "bpm" | "energy" | "release_date";

export default function PlaylistView() {
  const { id } = useParams<{ id: string }>();
  const { deviceId, user } = useStore();
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDesc, setSortDesc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState<Map<string, AudioFeatures>>(new Map());
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      spotify.getPlaylist(id),
      spotify.getPlaylistTracks(id),
    ])
      .then(([pl, tr]) => {
        setPlaylist(pl);
        setTracks(
          tr.items
            ?.filter((i: { track: SpotifyTrack | null }) => i.track)
            .map((i: { track: SpotifyTrack }) => i.track) ?? []
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Load audio features when needed (BPM/energy sort)
  const loadAudioFeatures = useCallback(async () => {
    if (featuresLoading || audioFeatures.size > 0) return;
    setFeaturesLoading(true);
    try {
      const ids = tracks.map((t) => t.id);
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
      const featureMap = new Map<string, AudioFeatures>();
      for (const chunk of chunks) {
        const res = await spotify.getAudioFeaturesBatch(chunk);
        chunk.forEach((id, idx) => {
          if (res[idx]) featureMap.set(id, res[idx]!);
        });
      }
      setAudioFeatures(featureMap);
    } catch { /* ok */ }
    finally { setFeaturesLoading(false); }
  }, [tracks, featuresLoading, audioFeatures.size]);

  useEffect(() => {
    if (sortKey === "bpm" || sortKey === "energy") {
      loadAudioFeatures();
    }
  }, [sortKey, loadAudioFeatures]);

  const sortedTracks = [...tracks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title": cmp = a.name.localeCompare(b.name); break;
      case "artist": cmp = a.artists[0]?.name.localeCompare(b.artists[0]?.name ?? "") ?? 0; break;
      case "album": cmp = a.album.name.localeCompare(b.album.name); break;
      case "duration": cmp = a.duration_ms - b.duration_ms; break;
      case "popularity": cmp = (a.popularity ?? 0) - (b.popularity ?? 0); break;
      case "release_date": cmp = a.album.release_date.localeCompare(b.album.release_date); break;
      case "bpm": {
        const af = audioFeatures.get(a.id);
        const bf = audioFeatures.get(b.id);
        cmp = (af?.tempo ?? 0) - (bf?.tempo ?? 0);
        break;
      }
      case "energy": {
        const af = audioFeatures.get(a.id);
        const bf = audioFeatures.get(b.id);
        cmp = (af?.energy ?? 0) - (bf?.energy ?? 0);
        break;
      }
      default: cmp = 0;
    }
    return sortDesc ? -cmp : cmp;
  });

  // Deduplicate
  const dupeIds = new Set<string>();
  const seen = new Set<string>();
  tracks.forEach((t) => {
    if (seen.has(t.id)) dupeIds.add(t.id);
    seen.add(t.id);
  });

  async function removeDuplicates() {
    if (!id || dupeIds.size === 0) return;
    const uris = [...dupeIds].map((tid) => {
      const t = tracks.find((t) => t.id === tid);
      return t?.uri ?? "";
    }).filter(Boolean);
    await spotify.removeFromPlaylist(id, uris);
    setTracks((prev) => {
      const keepSeen = new Set<string>();
      return prev.filter((t) => {
        if (keepSeen.has(t.id)) return false;
        keepSeen.add(t.id);
        return true;
      });
    });
  }

  async function removeSelected() {
    if (!id || selected.size === 0) return;
    const uris = tracks
      .filter((t) => selected.has(t.id))
      .map((t) => t.uri);
    await spotify.removeFromPlaylist(id, uris);
    setTracks((prev) => prev.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
  }

  async function addSelectedToPlaylist(targetId: string) {
    const uris = tracks.filter((t) => selected.has(t.id)).map((t) => t.uri);
    await spotify.addToPlaylist(targetId, uris);
    setShowAddToPlaylist(false);
  }

  async function addSelectedToQueue() {
    for (const t of tracks.filter((t) => selected.has(t.id))) {
      await spotify.addToQueue(t.uri).catch(() => {});
    }
  }

  function toggleSelect(trackId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === sortedTracks.length) setSelected(new Set());
    else setSelected(new Set(sortedTracks.map((t) => t.id)));
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }
  if (!playlist) return null;

  const totalMin = Math.round(tracks.reduce((s, t) => s + t.duration_ms, 0) / 60000);
  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "default", label: "Default" },
    { key: "title", label: "Title" },
    { key: "artist", label: "Artist" },
    { key: "album", label: "Album" },
    { key: "duration", label: "Duration" },
    { key: "popularity", label: "Popularity" },
    { key: "release_date", label: "Release Date" },
    { key: "bpm", label: "BPM" },
    { key: "energy", label: "Energy" },
  ];

  return (
    <div>
      {showInsights && <PlaylistInsights tracks={tracks} onClose={() => setShowInsights(false)} />}

      {/* Header */}
      <div
        style={{
          padding: "80px 24px 24px",
          background: "linear-gradient(to bottom, rgba(80,80,80,0.5), var(--bg-primary))",
          display: "flex",
          gap: 24,
          alignItems: "flex-end",
        }}
      >
        <img
          src={playlist.images?.[0]?.url ?? ""}
          alt=""
          style={{ width: 200, height: 200, borderRadius: 4, objectFit: "cover", boxShadow: "var(--card-shadow)" }}
        />
        <div>
          <div className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Playlist
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 12, lineHeight: 1 }}>{playlist.name}</h1>
          {playlist.description && (
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 8 }}
              dangerouslySetInnerHTML={{ __html: playlist.description }}
            />
          )}
          <div className="text-secondary" style={{ fontSize: 13 }}>
            {playlist.owner.display_name} · {tracks.length} songs, {totalMin} min
            {dupeIds.size > 0 && (
              <span style={{ color: "var(--danger, #e22134)", marginLeft: 8 }}>
                · {dupeIds.size} duplicate{dupeIds.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          style={{ borderRadius: "50%", width: 56, height: 56, padding: 0, justifyContent: "center" }}
          onClick={() => spotify.play({ context_uri: `spotify:playlist:${id}` }, deviceId ?? undefined)}
        >
          <Play size={24} fill="currentColor" color="#000" />
        </button>
        <button
          className="btn-ghost"
          onClick={() => { spotify.shuffle(true); spotify.play({ context_uri: `spotify:playlist:${id}` }, deviceId ?? undefined); }}
        >
          <Shuffle size={22} />
        </button>
        <BookmarkButton type="playlist" item_id={playlist.id} item_name={playlist.name} item_uri={`spotify:playlist:${playlist.id}`} />
        <ShareMenu name={playlist.name} spotifyUri={`spotify:playlist:${playlist.id}`} spotifyUrl={`https://open.spotify.com/playlist/${playlist.id}`} />
        <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowInsights(true)}>
          <TrendingUp size={14} /> Insights
        </button>
        {dupeIds.size > 0 && (
          <button className="btn btn-secondary" style={{ fontSize: 13, color: "var(--danger, #e22134)" }} onClick={removeDuplicates}>
            <Trash2 size={14} /> Remove {dupeIds.size} dupes
          </button>
        )}
        <button
          className="btn btn-secondary"
          style={{ fontSize: 13, color: bulkMode ? "var(--accent)" : undefined }}
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
        >
          {bulkMode ? <CheckSquare size={14} /> : <Square size={14} />} Bulk
        </button>
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div style={{
          margin: "0 24px 12px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--accent)",
          borderRadius: 8,
          padding: "10px 16px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <button onClick={toggleSelectAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
            {selected.size === sortedTracks.length ? <CheckSquare size={14} /> : <Square size={14} />}
            {selected.size === sortedTracks.length ? "Deselect all" : "Select all"}
          </button>
          <span className="text-muted" style={{ fontSize: 13 }}>{selected.size} selected</span>
          {selected.size > 0 && (
            <>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
                onClick={addSelectedToQueue}
              >
                Add to Queue
              </button>
              <div style={{ position: "relative" }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => {
                    if (userPlaylists.length === 0) {
                      spotify.getPlaylists().then((d) => setUserPlaylists(d.items?.map((p: SpotifyPlaylist) => ({ id: p.id, name: p.name })) ?? []));
                    }
                    setShowAddToPlaylist(!showAddToPlaylist);
                  }}
                >
                  <PlusCircle size={12} /> Add to Playlist
                </button>
                {showAddToPlaylist && userPlaylists.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, zIndex: 100,
                    background: "var(--bg-secondary)", border: "1px solid var(--border)",
                    borderRadius: 8, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    maxHeight: 200, overflowY: "auto",
                  }}>
                    {userPlaylists.filter((p) => p.id !== id).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addSelectedToPlaylist(p.id)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, color: "var(--danger, #e22134)" }}
                onClick={removeSelected}
              >
                <Trash2 size={12} /> Remove from playlist
              </button>
            </>
          )}
        </div>
      )}

      {/* Sort controls */}
      <div style={{ padding: "0 24px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <SortAsc size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              if (sortKey === key) setSortDesc(!sortDesc);
              else { setSortKey(key); setSortDesc(false); }
            }}
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: sortKey === key ? 700 : 400,
              background: sortKey === key ? "var(--accent)" : "var(--bg-tertiary)",
              color: sortKey === key ? "#000" : "var(--text-secondary)",
            }}
          >
            {label}{sortKey === key ? (sortDesc ? " ↓" : " ↑") : ""}
          </button>
        ))}
        {(sortKey === "bpm" || sortKey === "energy") && featuresLoading && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Loading audio data…</span>
        )}
      </div>

      {/* Track list */}
      <div style={{ padding: "0 24px 100px" }}>
        {bulkMode ? (
          <div>
            {sortedTracks.map((track) => (
              <div
                key={track.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 4px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: selected.has(track.id) ? "rgba(29,185,84,0.08)" : "transparent",
                  borderBottom: "1px solid var(--border)",
                }}
                onClick={() => toggleSelect(track.id)}
              >
                <div
                  style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    border: "2px solid " + (selected.has(track.id) ? "var(--accent)" : "var(--text-muted)"),
                    background: selected.has(track.id) ? "var(--accent)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {selected.has(track.id) && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <img
                  src={track.album.images?.[0]?.url ?? ""}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>{track.name}</div>
                  <div className="truncate text-secondary" style={{ fontSize: 12 }}>
                    {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                  </div>
                </div>
                {audioFeatures.has(track.id) && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                    <div>{Math.round(audioFeatures.get(track.id)!.tempo)} BPM</div>
                    <div>E: {Math.round(audioFeatures.get(track.id)!.energy * 100)}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <TrackList
            tracks={sortedTracks}
            contextUri={`spotify:playlist:${id}`}
            showAlbum
            showIndex
          />
        )}
      </div>
    </div>
  );
}
