import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { stats } from "../api/client";
import type { StatsOverview, TopTrack, TopArtist, ActivityDay } from "../types";
import { Flame, Clock, Music, Users } from "lucide-react";

type Period = "day" | "week" | "month" | "year" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

export default function Stats() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [byHour, setByHour] = useState<{ hour: string; plays: string }[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "tracks" | "artists" | "activity">("overview");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      stats.getOverview(),
      stats.getTopTracks(period),
      stats.getTopArtists(period),
      stats.getActivity(),
      stats.getByHour(),
      stats.getStreaks(),
    ])
      .then(([ov, tt, ta, act, bh, st]) => {
        setOverview(ov);
        setTopTracks(tt);
        setTopArtists(ta);
        setActivity(act);
        setByHour(bh);
        setStreaks(st);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const statCards = overview
    ? [
        { icon: Music, label: "Total Plays", value: overview.totalPlays.toLocaleString() },
        { icon: Clock, label: "Minutes Listened", value: overview.totalMinutes.toLocaleString() },
        { icon: Music, label: "Unique Tracks", value: overview.uniqueTracks.toLocaleString() },
        { icon: Users, label: "Unique Artists", value: overview.uniqueArtists.toLocaleString() },
        { icon: Flame, label: "Day Streak", value: `${streaks.currentStreak}d` },
        { icon: Flame, label: "Best Streak", value: `${streaks.longestStreak}d` },
      ]
    : [];

  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    plays: Number(byHour.find((h) => Number(h.hour) === i)?.plays ?? 0),
  }));

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Your Stats</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: period === p.value ? "var(--text-primary)" : "var(--bg-tertiary)",
                color: period === p.value ? "var(--bg-primary)" : "var(--text-secondary)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {statCards.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: "20px 16px",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon size={20} color="var(--accent)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{value}</div>
                <div className="text-secondary" style={{ fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {(["overview", "tracks", "artists", "activity"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  background: tab === t ? "var(--accent)" : "var(--bg-tertiary)",
                  color: tab === t ? "#000" : "var(--text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
              {/* Plays by hour */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid var(--border)",
                }}
              >
                <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Listening by hour</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourData}>
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                      tickFormatter={(h) => `${h}h`}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-tertiary)",
                        border: "none",
                        color: "var(--text-primary)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="plays" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Activity over time */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid var(--border)",
                }}
              >
                <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Activity (last 30 days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={activity.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-tertiary)",
                        border: "none",
                        color: "var(--text-primary)",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="plays"
                      stroke="var(--accent)"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === "tracks" && (
            <div>
              {topTracks.map((t, i) => (
                <div
                  key={t.track_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 12px",
                    borderRadius: 6,
                  }}
                >
                  <span className="text-muted" style={{ width: 24, fontSize: 13 }}>
                    {i + 1}
                  </span>
                  {t.album_art && (
                    <img
                      src={t.album_art}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 4, objectFit: "cover" }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                      {t.track_name}
                    </div>
                    <div className="truncate text-secondary" style={{ fontSize: 12 }}>
                      {t.artist_name}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>
                      {t.play_count}x
                    </div>
                    <div className="text-secondary" style={{ fontSize: 11 }}>
                      {Math.round(Number(t.total_ms) / 60000)} min
                    </div>
                  </div>
                </div>
              ))}
              {topTracks.length === 0 && (
                <p className="text-secondary" style={{ textAlign: "center", padding: 40 }}>
                  No listening data yet. Play some music!
                </p>
              )}
            </div>
          )}

          {tab === "artists" && (
            <div>
              {topArtists.map((a, i) => (
                <div
                  key={a.artist_name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 12px",
                    borderRadius: 6,
                  }}
                >
                  <span className="text-muted" style={{ width: 24, fontSize: 13 }}>
                    {i + 1}
                  </span>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--bg-elevated)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {a.artist_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.artist_name}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>
                      {a.unique_tracks} tracks
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>
                      {a.play_count}x
                    </div>
                    <div className="text-secondary" style={{ fontSize: 11 }}>
                      {Math.round(Number(a.total_ms) / 60000)} min
                    </div>
                  </div>
                </div>
              ))}
              {topArtists.length === 0 && (
                <p className="text-secondary" style={{ textAlign: "center", padding: 40 }}>
                  No listening data yet. Play some music!
                </p>
              )}
            </div>
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
                        background: plays === 0
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
