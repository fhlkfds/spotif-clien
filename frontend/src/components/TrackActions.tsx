import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, ListPlus, Bookmark, Share2, User, Disc } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { spotify, bookmarks as bookmarksApi } from "../api/client";
import { useStore } from "../store/useStore";
import type { SpotifyTrack, SpotifyPlaylist } from "../types";

interface Props {
  track: SpotifyTrack;
  playlists?: SpotifyPlaylist[];
}

export default function TrackActions({ track, playlists = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { deviceId } = useStore();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowPlaylists(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function addToQueue() {
    await spotify.addToQueue(track.uri);
    setOpen(false);
  }

  async function bookmark() {
    await bookmarksApi.add({
      type: "track",
      item_id: track.id,
      item_name: track.name,
      item_uri: track.uri,
      metadata: { artist: track.artists[0]?.name, album: track.album?.name },
    });
    setOpen(false);
  }

  async function addToPlaylist(playlistId: string) {
    await spotify.addToPlaylist(playlistId, [track.uri]);
    setOpen(false);
    setShowPlaylists(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(track.uri);
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1000);
  }

  const menuItemStyle = {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "8px 12px", background: "none",
    border: "none", cursor: "pointer", fontSize: 13,
    color: "var(--text-primary)", textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-ghost"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ padding: 4 }}
        title="More actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 200,
            zIndex: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <button onClick={addToQueue} style={menuItemStyle}>
            <ListPlus size={14} /> Add to queue
          </button>
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShowPlaylists(true)}
            onMouseLeave={() => setShowPlaylists(false)}
          >
            <button style={{ ...menuItemStyle, justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Disc size={14} /> Add to playlist
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>▶</span>
            </button>
            {showPlaylists && playlists.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  right: "calc(100% + 4px)",
                  top: 0,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "4px 0",
                  minWidth: 180,
                  maxHeight: 200,
                  overflowY: "auto",
                  zIndex: 201,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {playlists.map((pl) => (
                  <button key={pl.id} onClick={() => addToPlaylist(pl.id)} style={menuItemStyle}>
                    <span className="truncate">{pl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={bookmark} style={menuItemStyle}>
            <Bookmark size={14} /> Bookmark
          </button>
          <button onClick={copyLink} style={menuItemStyle}>
            <Share2 size={14} /> {copied ? "Copied URI!" : "Copy URI"}
          </button>
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button
            onClick={() => { navigate(`/artist/${track.artists[0]?.id}`); setOpen(false); }}
            style={menuItemStyle}
          >
            <User size={14} /> View Artist
          </button>
          <button
            onClick={() => { navigate(`/album/${track.album?.id}`); setOpen(false); }}
            style={menuItemStyle}
          >
            <Disc size={14} /> View Album
          </button>
        </div>
      )}
    </div>
  );
}
