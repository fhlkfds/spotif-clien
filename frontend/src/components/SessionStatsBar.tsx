import { useEffect, useState } from "react";
import { Clock, Music, Repeat2, SkipForward } from "lucide-react";
import { useStore } from "../store/useStore";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

export default function SessionStatsBar() {
  const { sessionStartMs, sessionTrackCount, sessionLoops } = useStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - sessionStartMs), 1000);
    return () => clearInterval(id);
  }, [sessionStartMs]);

  const items = [
    { icon: Clock, label: formatElapsed(elapsed), title: "Session duration" },
    { icon: Music, label: `${sessionTrackCount} tracks`, title: "Tracks played this session" },
    { icon: Repeat2, label: `${sessionLoops} loops`, title: "Songs looped" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "8px 0",
        flexWrap: "wrap",
      }}
    >
      {items.map(({ icon: Icon, label, title }) => (
        <div
          key={title}
          title={title}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <Icon size={14} color="var(--accent)" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
