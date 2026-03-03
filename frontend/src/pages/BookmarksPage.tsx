import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark as BookmarkIcon, Trash2 } from "lucide-react";
import { bookmarks as bookmarksApi } from "../api/client";
import type { Bookmark } from "../types";

type TabType = "track" | "album" | "artist" | "playlist";

const TABS: { key: TabType; label: string }[] = [
  { key: "track", label: "Tracks" },
  { key: "album", label: "Albums" },
  { key: "artist", label: "Artists" },
  { key: "playlist", label: "Playlists" },
];

function routeFor(b: Bookmark): string {
  switch (b.type) {
    case "album": return `/album/${b.item_id}`;
    case "artist": return `/artist/${b.item_id}`;
    case "playlist": return `/playlist/${b.item_id}`;
    default: return "#";
  }
}

export default function BookmarksPage() {
  const [tab, setTab] = useState<TabType>("track");
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    bookmarksApi
      .list(tab)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  async function remove(b: Bookmark) {
    await bookmarksApi.remove(b.type, b.item_id);
    setItems((prev) => prev.filter((x) => x.id !== b.id));
  }

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <BookmarkIcon size={28} color="var(--accent)" />
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Bookmarks</h1>
      </div>

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
              background: tab === key ? "var(--text-primary)" : "var(--bg-tertiary)",
              color: tab === key ? "var(--bg-primary)" : "var(--text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: 60,
            background: "var(--bg-secondary)",
            borderRadius: 12,
            border: "1px solid var(--border)",
          }}
        >
          <BookmarkIcon size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No {tab} bookmarks yet.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "12px 16px",
                cursor: b.type !== "track" ? "pointer" : "default",
                transition: "background 0.15s",
              }}
              onClick={() => {
                if (b.type !== "track") navigate(routeFor(b));
              }}
              onMouseEnter={(e) => b.type !== "track" && (e.currentTarget.style.background = "var(--bg-tertiary)")}
              onMouseLeave={(e) => b.type !== "track" && (e.currentTarget.style.background = "var(--bg-secondary)")}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                  {b.item_name}
                </div>
                <div className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                  {b.type} · {new Date(b.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                className="btn-ghost"
                onClick={(e) => { e.stopPropagation(); remove(b); }}
                style={{ color: "var(--danger)", padding: 6 }}
                title="Remove bookmark"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
