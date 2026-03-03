import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../store/useStore";
import { lyrics as lyricsApi } from "../api/client";
import type { LyricsData } from "../types";

interface LrcLine {
  ms: number;
  text: string;
}

function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/);
    if (m) {
      const ms = (parseInt(m[1]) * 60 + parseFloat(m[2])) * 1000;
      if (m[3].trim()) lines.push({ ms, text: m[3].trim() });
    }
  }
  return lines.sort((a, b) => a.ms - b.ms);
}

export default function LyricsPanel() {
  const { lyricsOpen, setLyricsOpen, playbackState } = useStore();
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const activeRef = useRef<HTMLDivElement>(null);
  const prevTrackId = useRef<string | null>(null);

  const track = playbackState?.item;

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!track || track.id === prevTrackId.current) return;
    prevTrackId.current = track.id;
    setLyricsData(null);
    setLrcLines([]);
    setCurrentLine(0);

    lyricsApi
      .get(track.id, track.artists[0]?.name ?? "", track.name)
      .then((data) => {
        setLyricsData(data);
        if (data.synced_lyrics) {
          setLrcLines(parseLrc(data.synced_lyrics));
        }
      })
      .catch(() => {});
  }, [track?.id]);

  // Update current line based on progress
  useEffect(() => {
    if (!lrcLines.length || !playbackState) return;
    const ms = playbackState.progress_ms;
    let idx = 0;
    for (let i = 0; i < lrcLines.length; i++) {
      if (lrcLines[i].ms <= ms) idx = i;
      else break;
    }
    setCurrentLine(idx);
  }, [playbackState?.progress_ms, lrcLines]);

  // Auto-scroll to current line
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentLine]);

  if (!lyricsOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 90,
        top: 16,
        width: 320,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        zIndex: 500,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Lyrics</div>
          {track && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {track.name} — {track.artists[0]?.name}
            </div>
          )}
        </div>
        <button className="btn-ghost" onClick={() => setLyricsOpen(false)} style={{ padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
        {!lyricsData && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13 }}>Loading lyrics...</div>
          </div>
        )}

        {lyricsData && !lyricsData.synced_lyrics && !lyricsData.plain_lyrics && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40, fontSize: 13 }}>
            No lyrics found for this track.
          </div>
        )}

        {lyricsData && lrcLines.length > 0 && (
          <div>
            {lrcLines.map((line, i) => (
              <div
                key={i}
                ref={i === currentLine ? activeRef : null}
                style={{
                  padding: "6px 0",
                  fontSize: i === currentLine ? 16 : 14,
                  fontWeight: i === currentLine ? 700 : 400,
                  color: i === currentLine ? "var(--text-primary)" : "var(--text-muted)",
                  lineHeight: 1.5,
                  transition: "all 0.3s",
                  cursor: "default",
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        )}

        {lyricsData && !lrcLines.length && lyricsData.plain_lyrics && (
          <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
            {lyricsData.plain_lyrics}
          </div>
        )}
      </div>

      {/* Footer */}
      {lyricsData?.source && (
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Source: {lyricsData.source}
        </div>
      )}
    </div>
  );
}
