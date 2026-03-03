import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Link } from "lucide-react";

interface Props {
  spotifyUri?: string;
  spotifyUrl?: string;
  name: string;
}

export default function ShareMenu({ spotifyUri, spotifyUrl, name }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        title="Share"
        style={{ padding: 6 }}
      >
        <Share2 size={18} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 200,
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ padding: "6px 12px", fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Share "{name}"
          </div>
          {spotifyUrl && (
            <button
              onClick={() => copy(spotifyUrl, "link")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 12px", background: "none",
                border: "none", cursor: "pointer", fontSize: 13,
                color: copied === "link" ? "var(--accent)" : "var(--text-primary)",
                textAlign: "left",
              }}
            >
              <Link size={14} />
              {copied === "link" ? "Copied!" : "Copy Spotify link"}
            </button>
          )}
          {spotifyUri && (
            <button
              onClick={() => copy(spotifyUri, "uri")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 12px", background: "none",
                border: "none", cursor: "pointer", fontSize: 13,
                color: copied === "uri" ? "var(--accent)" : "var(--text-primary)",
                textAlign: "left",
              }}
            >
              <Copy size={14} />
              {copied === "uri" ? "Copied!" : "Copy URI"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
