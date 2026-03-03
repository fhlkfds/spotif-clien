import { ExternalLink } from "lucide-react";

interface Props {
  query: string;
}

const PLATFORMS = [
  { label: "Spotify", color: "#1DB954", url: (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  { label: "YT Music", color: "#FF0000", url: (q: string) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
  { label: "Apple Music", color: "#FA2E5B", url: (q: string) => `https://music.apple.com/us/search?term=${encodeURIComponent(q)}` },
  { label: "Tidal", color: "#00FFFF", url: (q: string) => `https://listen.tidal.com/search?q=${encodeURIComponent(q)}` },
  { label: "Genius", color: "#FFFF64", url: (q: string) => `https://genius.com/search?q=${encodeURIComponent(q)}` },
];

export default function ExternalLinks({ query }: Props) {
  if (!query) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 4 }}>Listen on:</span>
      {PLATFORMS.map(({ label, color, url }) => (
        <a
          key={label}
          href={url(query)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: "var(--bg-tertiary)",
            color,
            textDecoration: "none",
            border: `1px solid ${color}33`,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = `${color}22`)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
        >
          {label}
          <ExternalLink size={11} />
        </a>
      ))}
    </div>
  );
}
