import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { spotify, lastfm } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import BookmarkButton from "../components/BookmarkButton";
import ShareMenu from "../components/ShareMenu";
import TagChips from "../components/TagChips";
import ExternalLinks from "../components/ExternalLinks";
import type { SpotifyArtist, SpotifyTrack, SpotifyAlbum, LastFmTag } from "../types";

type ArtistTab = "tracks" | "albums" | "related" | "tags";

export default function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const { deviceId } = useStore();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [related, setRelated] = useState<SpotifyArtist[]>([]);
  const [tags, setTags] = useState<LastFmTag[]>([]);
  const [tab, setTab] = useState<ArtistTab>("tracks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      spotify.getArtist(id),
      spotify.getArtistTopTracks(id),
    ])
      .then(([a, tt]) => {
        setArtist(a);
        setTopTracks(tt.tracks ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !artist) return;
    if (tab === "albums" && albums.length === 0) {
      spotify.getArtistAlbums(id).then((d) => setAlbums(d?.items ?? [])).catch(() => {});
    }
    if (tab === "related" && related.length === 0) {
      spotify.getRelatedArtists(id).then((d) => setRelated(d?.artists ?? [])).catch(() => {});
    }
    if (tab === "tags" && tags.length === 0 && artist.name) {
      lastfm.artistTags(artist.name).then((d) => setTags(d?.toptags?.tag ?? [])).catch(() => {});
    }
  }, [tab, id, artist]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }
  if (!artist) return null;

  const TABS: { key: ArtistTab; label: string }[] = [
    { key: "tracks", label: "Popular" },
    { key: "albums", label: "Albums" },
    { key: "related", label: "Related Artists" },
    { key: "tags", label: "Tags" },
  ];

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          position: "relative",
          padding: "80px 24px 24px",
          background: "linear-gradient(to bottom, rgba(40,40,40,0.8), var(--bg-primary))",
          minHeight: 280,
          display: "flex",
          alignItems: "flex-end",
          gap: 24,
        }}
      >
        {artist.images?.[0]?.url && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${artist.images[0].url})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "brightness(0.4)",
              zIndex: 0,
            }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, color: "var(--text-secondary)" }}>
            Artist
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, marginBottom: 8, lineHeight: 1 }}>
            {artist.name}
          </h1>
          {artist.followers && (
            <div className="text-secondary" style={{ fontSize: 14 }}>
              {artist.followers.total.toLocaleString()} followers
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="btn btn-primary"
          style={{ borderRadius: "50%", width: 56, height: 56, padding: 0, justifyContent: "center" }}
          onClick={() => spotify.play({ context_uri: `spotify:artist:${id}` }, deviceId ?? undefined)}
        >
          <Play size={24} fill="currentColor" color="#000" />
        </button>
        <BookmarkButton
          type="artist"
          item_id={artist.id}
          item_name={artist.name}
          item_uri={`spotify:artist:${artist.id}`}
        />
        <ShareMenu
          name={artist.name}
          spotifyUri={`spotify:artist:${artist.id}`}
          spotifyUrl={`https://open.spotify.com/artist/${artist.id}`}
        />
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 24px", display: "flex", gap: 8, marginBottom: 24 }}>
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

      <div style={{ padding: "0 24px 100px" }}>
        {tab === "tracks" && (
          <TrackList tracks={topTracks} showAlbum showIndex={false} />
        )}

        {tab === "albums" && (
          <div className="grid-cards">
            {albums.map((album) => (
              <div
                key={album.id}
                className="card"
                onClick={() => navigate(`/album/${album.id}`)}
              >
                <img
                  src={album.images?.[0]?.url ?? ""}
                  alt=""
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4, marginBottom: 12 }}
                />
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{album.name}</div>
                <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  {album.release_date?.split("-")[0]} · {album.total_tracks} tracks
                </div>
              </div>
            ))}
            {albums.length === 0 && (
              <p className="text-secondary" style={{ padding: 20 }}>No albums found.</p>
            )}
          </div>
        )}

        {tab === "related" && (
          <div className="grid-cards">
            {related.map((a) => (
              <div
                key={a.id}
                className="card"
                style={{ textAlign: "center", cursor: "pointer" }}
                onClick={() => navigate(`/artist/${a.id}`)}
              >
                <img
                  src={a.images?.[0]?.url ?? ""}
                  alt=""
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "50%", marginBottom: 12 }}
                />
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Artist</div>
              </div>
            ))}
            {related.length === 0 && (
              <p className="text-secondary" style={{ padding: 20 }}>No related artists found.</p>
            )}
          </div>
        )}

        {tab === "tags" && (
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Last.fm Tags</h3>
            <TagChips tags={tags} />
            {tags.length === 0 && (
              <p className="text-secondary" style={{ padding: 20 }}>No tags found.</p>
            )}
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Listen elsewhere</h3>
              <ExternalLinks query={artist.name} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
