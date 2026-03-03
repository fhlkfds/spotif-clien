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
import { Flame, Clock, Music, Users, SkipForward } from "lucide-react";
import SessionStatsBar from "../components/SessionStatsBar";

type Period = "day" | "week" | "month" | "year" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

interface SkipStats {
  skipCount: number;
  totalPlays: number;
  skipRate: number;
  topSkipped: TopTrack[];
}

interface SessionRow {
  session_id: string;
  started_at: string;
  ended_at: string;
  track_count: string;
  skip_count: string;
  duration_secs: string;
}

export default function Stats() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [byHour, setByHour] = useState<{ hour: string; plays: string }[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  const [skipStats, setSkipStats] = useState<SkipStats | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "tracks" | "artists" | "activity" | "skips" | "sessions">("overview");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      stats.getOverview(),
      stats.getTopTracks(period),
      stats.getTopArtists(period),
      stats.getActivity(),
      stats.getByHour(),
      stats.getStreaks(),
      fetch(`/api/stats/skips?period=${period}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/stats/sessions", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([ov, tt, ta, act, bh, st, sk, sess]) => {
        setOverview(ov);
        setTopTracks(tt);
        setTopArtists(ta);
        setActivity(act);
        setByHour(bh);
        setStreaks(st);
        setSkipStats(sk);
        setSessions(sess);
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
        { icon: SkipForward, label: "Skip Rate", value: skipStats ? `${skipStats.skipRate}%` : "—" },
      ]
    : [];

  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    plays: Number(byHour.find((h) => Number(h.hour) === i)?.plays ?? 0),
  }));

  const ALL_TABS = ["overview", "tracks", "artists", "activity", "skips", "sessions"] as const;

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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

      {/* Session stats bar */}
      <div style={{ marginBottom: 24 }}>
        <SessionStatsBar />
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
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {ALL_TABS.map((t) => (
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
                  <span className="text-muted" style={{ width: 24, fontSize: 13 }}>{i + 1}</span>
                  {t.album_art && (
                    <img src={t.album_art} alt="" style={{ width: 44, height: 44, borderRadius: 4, objectFit: "cover" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{t.track_name}</div>
                    <div className="truncate text-secondary" style={{ fontSize: 12 }}>{t.artist_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>{t.play_count}x</div>
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
                  <span className="text-muted" style={{ width: 24, fontSize: 13 }}>{i + 1}</span>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "var(--bg-elevated)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 700, color: "var(--accent)",
                    }}
                  >
                    {a.artist_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.artist_name}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{a.unique_tracks} tracks</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>{a.play_count}x</div>
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

          {tab === "skips" && skipStats && (
            <div style={{ display: "grid", gap: 20 }}>
              {/* Summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {[
                  { label: "Total Skips", value: skipStats.skipCount },
                  { label: "Total Plays", value: skipStats.totalPlays },
                  { label: "Skip Rate", value: `${skipStats.skipRate}%` },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--bg-secondary)",
                      borderRadius: 10,
                      padding: "20px 16px",
                      border: "1px solid var(--border)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{value}</div>
                    <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Top skipped */}
              {skipStats.topSkipped.length > 0 && (
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 10,
                    padding: 20,
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Most Skipped Tracks</h3>
                  {skipStats.topSkipped.map((t, i) => (
                    <div
                      key={t.track_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: i < skipStats.topSkipped.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <span className="text-muted" style={{ width: 20, fontSize: 13 }}>{i + 1}</span>
                      {t.album_art && (
                        <img src={t.album_art} alt="" style={{ width: 36, height: 36, borderRadius: 3 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{t.track_name}</div>
                        <div className="truncate text-secondary" style={{ fontSize: 12 }}>{t.artist_name}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--danger)", fontWeight: 700 }}>
                        <SkipForward size={14} />
                        {t.play_count}x
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "sessions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.map((s) => {
                const durMin = Math.round(Number(s.duration_secs) / 60);
                return (
                  <div
                    key={s.session_id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {new Date(s.started_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" — "}
                        {new Date(s.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700, color: "var(--accent)" }}>{s.track_count}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>tracks</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700 }}>{durMin}m</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>duration</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700, color: "var(--danger)" }}>{s.skip_count}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>skips</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <p className="text-secondary" style={{ textAlign: "center", padding: 40 }}>
                  No session data yet.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
