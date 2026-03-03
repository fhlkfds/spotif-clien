import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Library,
  BarChart2,
  Settings,
  LogOut,
  Music,
  Plus,
  Check,
  X,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { spotify, auth } from "../api/client";
import type { SpotifyPlaylist } from "../types";

const NAV = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/stats", icon: BarChart2, label: "Stats" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { user, setAuth } = useStore();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    spotify.getPlaylists()
      .then((d) => setPlaylists(d.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (creating) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [creating]);

  async function handleLogout() {
    await auth.logout();
    setAuth(null, false);
  }

  async function createPlaylist() {
    if (!newName.trim() || !user) return;
    setSaving(true);
    try {
      const pl = await spotify.createPlaylist(user.id, newName.trim());
      setPlaylists((prev) => [pl, ...prev]);
      navigate(`/playlist/${pl.id}`);
      setCreating(false);
      setNewName("");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function cancelCreate() {
    setCreating(false);
    setNewName("");
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding: "24px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
        <Music size={28} color="var(--accent)" />
        <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
          SpotClient
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "8px 8px" }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 6,
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: isActive ? 700 : 400,
              background: isActive ? "var(--bg-tertiary)" : "transparent",
              textDecoration: "none",
              fontSize: 14,
              transition: "all 0.15s",
            })}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

      {/* Playlists */}
      <div style={{ padding: "0 8px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Playlists
          <button
            className="btn-ghost"
            style={{ padding: 4, borderRadius: 4 }}
            title="Create playlist"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Inline create form */}
        {creating && (
          <div style={{ padding: "4px 8px 8px" }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createPlaylist();
                if (e.key === "Escape") cancelCreate();
              }}
              placeholder="Playlist name"
              style={{ fontSize: 13, padding: "6px 10px", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={createPlaylist}
                disabled={saving || !newName.trim()}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 4,
                  border: "none",
                  background: "var(--accent)",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  opacity: saving || !newName.trim() ? 0.5 : 1,
                }}
              >
                <Check size={13} /> Create
              </button>
              <button
                onClick={cancelCreate}
                style={{
                  padding: "5px 8px",
                  borderRadius: 4,
                  border: "none",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 13,
                transition: "color 0.15s",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {pl.name}
            </button>
          ))}
        </div>
      </div>

      {/* User */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {user?.images?.[0]?.url ? (
          <img
            src={user.images[0].url}
            alt={user.display_name}
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--bg-elevated)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {user?.display_name?.[0] ?? "?"}
            </span>
          </div>
        )}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>
            {user?.display_name}
          </div>
        </div>
        <button className="btn-ghost" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
