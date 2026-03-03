import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, ListPlus } from "lucide-react";
import { spotify, lastfm } from "../api/client";
import { useStore } from "../store/useStore";
import TrackList from "../components/TrackList";
import BookmarkButton from "../components/BookmarkButton";
import ShareMenu from "../components/ShareMenu";
import TagChips from "../components/TagChips";
import ExternalLinks from "../components/ExternalLinks";
import type { SpotifyAlbum, SpotifyTrack, LastFmTag } from "../types";

export default function AlbumView() {
  const { id } = useParams<{ id: string }>();
  const { deviceId } = useStore();
  const [album, setAlbum] = useState<SpotifyAlbum & { tracks: { items: SpotifyTrack[] } } | null>(null);
  const [tags, setTags] = useState<LastFmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToQueue, setAddingToQueue] = useState(false);

  useEffect(() => {
    if (!id) return;
    spotify.getAlbum(id).then((a) => {
      setAlbum(a);
      // Fetch Last.fm tags for this album
      if (a?.artists?.[0]?.name && a?.name) {
        lastfm
          .albumTags(a.artists[0].name, a.name)
          .then((d) => setTags(d?.toptags?.tag ?? []))
          .catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [id]);

  async function addAlbumToQueue() {
    if (!album || addingToQueue) return;
    setAddingToQueue(true);
    try {
      for (const track of album.tracks.items) {
        await spotify.addToQueue(track.uri);
      }
    } catch {
      // ignore
    } finally {
      setAddingToQueue(false);
    }
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }
  if (!album) return null;

  const artistName = album.artists[0]?.name ?? "";

  return (
    <div>
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
          src={album.images?.[0]?.url ?? ""}
          alt=""
          style={{ width: 200, height: 200, borderRadius: 4, objectFit: "cover", boxShadow: "var(--card-shadow)" }}
        />
        <div style={{ flex: 1 }}>
          <div className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Album
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
            {album.name}
          </h1>
          <div className="text-secondary" style={{ fontSize: 13 }}>
            {album.artists.map((a) => (
              <Link key={a.id} to={`/artist/${a.id}`} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {a.name}
              </Link>
            ))} · {album.release_date?.split("-")[0]} · {album.total_tracks} tracks
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="btn btn-primary"
          style={{ borderRadius: "50%", width: 56, height: 56, padding: 0, justifyContent: "center" }}
          onClick={() => spotify.play({ context_uri: `spotify:album:${id}` }, deviceId ?? undefined)}
        >
          <Play size={24} fill="currentColor" color="#000" />
        </button>
        <button
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={addAlbumToQueue}
          disabled={addingToQueue}
          title="Add all tracks to queue"
        >
          <ListPlus size={16} />
          {addingToQueue ? "Adding..." : "Add to Queue"}
        </button>
        <BookmarkButton
          type="album"
          item_id={album.id}
          item_name={album.name}
          item_uri={`spotify:album:${album.id}`}
          metadata={{ artist: artistName }}
        />
        <ShareMenu
          name={album.name}
          spotifyUri={`spotify:album:${album.id}`}
          spotifyUrl={`https://open.spotify.com/album/${album.id}`}
        />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ padding: "0 24px 16px" }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "var(--text-secondary)" }}>
            Last.fm Tags
          </h3>
          <TagChips tags={tags} />
        </div>
      )}

      {/* External links */}
      <div style={{ padding: "0 24px 16px" }}>
        <ExternalLinks query={`${artistName} ${album.name}`} />
      </div>

      <div style={{ padding: "0 24px 100px" }}>
        <TrackList
          tracks={album.tracks.items}
          contextUri={`spotify:album:${id}`}
          showAlbum={false}
          showIndex
        />
      </div>
    </div>
  );
}
