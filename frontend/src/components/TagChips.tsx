import { useNavigate } from "react-router-dom";
import type { LastFmTag } from "../types";

interface Props {
  tags: LastFmTag[];
}

export default function TagChips({ tags }: Props) {
  const navigate = useNavigate();
  if (!tags.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tags.slice(0, 12).map((tag) => (
        <button
          key={tag.name}
          onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
          style={{
            padding: "4px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent)";
            e.currentTarget.style.color = "#000";
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
