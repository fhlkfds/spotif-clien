import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";
import { lastfm } from "../api/client";

type SubTab = "artists" | "albums" | "tracks";

interface LfmArtist {
  name: string;
  url: string;
  image?: { "#text": string; size: string }[];
}
interface LfmAlbum {
  name: string;
  url: string;
  artist?: { name: string };
  image?: { "#text": string; size: string }[];
}
interface LfmTrack {
  name: string;
  url: string;
  artist?: { name: string };
  duration?: string;
}

export default function TagPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SubTab>("artists");
  const [artists, setArtists] = useState<LfmArtist[]>([]);
  const [albums, setAlbums] = useState<LfmAlbum[]>([]);
  const [tracks, setTracks] = useState<LfmTrack[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const decodedName = name ? decodeURIComponent(name) : "";

  useEffect(() => {
    if (!decodedName) return;
    setLoading(true);
    Promise.all([
      lastfm.tagArtists(decodedName, page),
      lastfm.tagAlbums(decodedName, page),
      lastfm.tagTracks(decodedName, page),
    ])
      .then(([a, al, t]) => {
        setArtists(a?.topartists?.artist ?? []);
        setAlbums(al?.topalbums?.album ?? []);
        setTracks(t?.toptracks?.track ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [decodedName, page]);

  function getImage(images?: { "#text": string; size: string }[]) {
    return images?.find((i) => i.size === "large")?.["#text"] ??
           images?.find((i) => i.size === "medium")?.["#text"] ?? "";
  }

  const TABS: { key: SubTab; label: string }[] = [
    { key: "artists", label: "Top Artists" },
    { key: "albums", label: "Top Albums" },
    { key: "tracks", label: "Top Tracks" },
  ];

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Tag size={24} color="var(--accent)" />
        <h1 style={{ fontSize: 28, fontWeight: 700, textTransform: "capitalize" }}>
          {decodedName}
        </h1>
      </div>
      <p className="text-secondary" style={{ fontSize: 13, marginBottom: 24 }}>
        Last.fm tag · top content
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: tab === key ? "var(--accent)" : "var(--bg-tertiary)",
              color: tab === key ? "#000" : "var(--text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {tab === "artists" && (
            <div className="grid-cards">
              {artists.map((a) => (
                <div
                  key={a.name}
                  className="card"
                  style={{ textAlign: "center", cursor: "pointer" }}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(a.name)}`)}
                >
                  {getImage(a.image) ? (
                    <img
                      src={getImage(a.image)}
                      alt=""
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "50%", marginBottom: 12 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%", aspectRatio: "1", borderRadius: "50%",
                        background: "var(--bg-elevated)", marginBottom: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 28, fontWeight: 700, color: "var(--accent)",
                      }}
                    >
                      {a.name[0]}
                    </div>
                  )}
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                  <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Artist</div>
                </div>
              ))}
            </div>
          )}

          {tab === "albums" && (
            <div className="grid-cards">
              {albums.map((al) => (
                <div
                  key={`${al.artist?.name}-${al.name}`}
                  className="card"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(`${al.artist?.name} ${al.name}`)}`)}
                >
                  {getImage(al.image) ? (
                    <img
                      src={getImage(al.image)}
                      alt=""
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4, marginBottom: 12 }}
                    />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1", background: "var(--bg-elevated)", borderRadius: 4, marginBottom: 12 }} />
                  )}
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{al.name}</div>
                  <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                    {al.artist?.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "tracks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {tracks.map((t, i) => (
                <div
                  key={`${t.artist?.name}-${t.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(`${t.artist?.name} ${t.name}`)}`)}
                >
                  <span className="text-muted" style={{ width: 24, fontSize: 13 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div className="truncate text-secondary" style={{ fontSize: 12 }}>{t.artist?.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "center" }}>
            <button
              className="btn btn-secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: "8px 16px", color: "var(--text-secondary)", fontSize: 13 }}>
              Page {page}
            </span>
            <button className="btn btn-secondary" onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
