import { useEffect, useState } from "react";
import { Clock, SkipForward, Layers } from "lucide-react";
import { stats } from "../api/client";

interface HistoryEntry {
  id: number;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_art: string;
  duration_ms: number;
  played_at: string;
  skipped?: boolean;
  crossfaded?: boolean;
  play_duration_ms?: number;
}

interface ActivityDay {
  date: string;
  plays: string;
}

type TabType = "player" | "activity";

export default function HistoryPage() {
  const [tab, setTab] = useState<TabType>("player");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const LIMIT = 50;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      stats.getHistory(LIMIT, offset),
      stats.getActivity(),
    ])
      .then(([h, act]) => {
        setHistory(h);
        setActivity(act);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [offset]);

  function formatTime(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }

  const TABS: { key: TabType; label: string }[] = [
    { key: "player", label: "Play History" },
    { key: "activity", label: "Activity Heatmap" },
  ];

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Clock size={28} color="var(--accent)" />
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>History</h1>
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
              background: tab === key ? "var(--accent)" : "var(--bg-tertiary)",
              color: tab === key ? "#000" : "var(--text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {tab === "player" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 6,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {entry.album_art && (
                      <img
                        src={entry.album_art}
                        alt=""
                        style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                        {entry.track_name}
                      </div>
                      <div className="truncate text-secondary" style={{ fontSize: 12 }}>
                        {entry.artist_name} · {entry.album_name}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      {entry.skipped && (
                        <span
                          title="Skipped"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: "rgba(226,33,52,0.15)", color: "var(--danger)",
                          }}
                        >
                          <SkipForward size={10} /> Skip
                        </span>
                      )}
                      {entry.crossfaded && (
                        <span
                          title="Crossfaded"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: "rgba(29,185,84,0.15)", color: "var(--accent)",
                          }}
                        >
                          <Layers size={10} /> CF
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {entry.play_duration_ms != null && (
                        <div style={{ fontSize: 12, color: "var(--accent)" }}>
                          {formatTime(entry.play_duration_ms)}
                        </div>
                      )}
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {new Date(entry.played_at).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {history.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60, fontSize: 14 }}>
                  No history yet. Start listening!
                </div>
              )}
              {/* Pagination */}
              <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "center" }}>
                <button
                  className="btn btn-secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={history.length < LIMIT}
                  onClick={() => setOffset((o) => o + LIMIT)}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {tab === "activity" && (
            <div>
              <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Activity Heatmap (last year)</h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid var(--border)",
                }}
              >
                {activity.map((day) => {
                  const plays = Number(day.plays);
                  const intensity = Math.min(plays / 30, 1);
                  return (
                    <div
                      key={day.date}
                      title={`${day.date}: ${plays} plays`}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background:
                          plays === 0
                            ? "var(--bg-tertiary)"
                            : `rgba(29, 185, 84, ${0.2 + intensity * 0.8})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
