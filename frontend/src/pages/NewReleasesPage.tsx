import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { spotify } from "../api/client";
import type { NewRelease } from "../types";

export default function NewReleasesPage() {
  const [albums, setAlbums] = useState<NewRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    spotify
      .getNewReleases(50)
      .then((data) => setAlbums(data?.albums?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>New Releases</h1>
      <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
        Fresh music from Spotify
      </p>

      <div className="grid-cards">
        {albums.map((album) => (
          <div
            key={album.id}
            className="card"
            onClick={() => navigate(`/album/${album.id}`)}
            style={{ position: "relative" }}
          >
            <div style={{ position: "relative", marginBottom: 12 }}>
              <img
                src={album.images?.[0]?.url ?? ""}
                alt=""
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "var(--accent)",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {album.release_date?.split("-")[0]}
              </div>
            </div>
            <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
              {album.name}
            </div>
            <div className="truncate text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
              {album.artists.map((a) => a.name).join(", ")}
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
              {album.total_tracks} tracks · {album.release_date}
            </div>
          </div>
        ))}
      </div>

      {albums.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>
          No new releases found.
        </div>
      )}
    </div>
  );
}
