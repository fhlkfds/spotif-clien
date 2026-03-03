import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { bookmarks as bookmarksApi } from "../api/client";
import type { Bookmark as BookmarkType } from "../types";

type Props = Omit<BookmarkType, "id" | "created_at">;

export default function BookmarkButton({ type, item_id, item_name, item_uri, metadata }: Props) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bookmarksApi.check(type, item_id).then(setSaved).catch(() => {});
  }, [type, item_id]);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      if (saved) {
        await bookmarksApi.remove(type, item_id);
        setSaved(false);
      } else {
        await bookmarksApi.add({ type, item_id, item_name, item_uri, metadata });
        setSaved(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? "Remove bookmark" : "Bookmark"}
      style={{
        background: "none",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        padding: 6,
        color: saved ? "var(--accent)" : "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => !saved && (e.currentTarget.style.color = "var(--text-primary)")}
      onMouseLeave={(e) => !saved && (e.currentTarget.style.color = "var(--text-secondary)")}
    >
      {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
    </button>
  );
}
