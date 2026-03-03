import { useEffect, useState } from "react";
import { X, TrendingUp, Music, AlertCircle, CheckCircle } from "lucide-react";
import { spotify } from "../api/client";
import type { SpotifyTrack, AudioFeatures, PlaylistInsights as PlaylistInsightsType } from "../types";

interface Props {
  tracks: SpotifyTrack[];
  onClose: () => void;
}

function moodLabel(valence: number): string {
  if (valence > 0.7) return "Upbeat 😊";
  if (valence > 0.4) return "Balanced 😐";
  return "Melancholic 😔";
}
function energyLabel(energy: number): string {
  if (energy > 0.75) return "High energy 🔥";
  if (energy > 0.4) return "Moderate 🎵";
  return "Chill 😌";
}

export default function PlaylistInsights({ tracks, onClose }: Props) {
  const [insights, setInsights] = useState<PlaylistInsightsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [dupeCount, setDupeCount] = useState(0);

  useEffect(() => {
    async function analyze() {
      setLoading(true);
      try {
        // Find duplicates
        const idMap = new Map<string, number>();
        tracks.forEach((t) => idMap.set(t.id, (idMap.get(t.id) ?? 0) + 1));
        const dupes = [...idMap.values()].filter((v) => v > 1).length;
        setDupeCount(dupes);

        // Batch audio features (100 per request)
        const ids = [...new Set(tracks.map((t) => t.id))];
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
        const featureResults: (AudioFeatures | null)[] = [];
        for (const chunk of chunks) {
          const res = await spotify.getAudioFeaturesBatch(chunk);
          featureResults.push(...res);
        }
        const valid = featureResults.filter(Boolean) as AudioFeatures[];

        if (valid.length === 0) {
          setLoading(false);
          return;
        }

        const avg = (key: keyof AudioFeatures) =>
          valid.reduce((s, f) => s + (f[key] as number), 0) / valid.length;

        // Artist diversity
        const artistMap = new Map<string, number>();
        tracks.forEach((t) => t.artists.forEach((a) => artistMap.set(a.name, (artistMap.get(a.name) ?? 0) + 1)));
        const topArtists = [...artistMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));
        const totalDuration = tracks.reduce((s, t) => s + t.duration_ms, 0);

        setInsights({
          trackCount: tracks.length,
          totalDuration,
          avgEnergy: avg("energy"),
          avgValence: avg("valence"),
          avgTempo: avg("tempo"),
          avgDanceability: avg("danceability"),
          topArtists,
          moodLabel: moodLabel(avg("valence")),
          energyLabel: energyLabel(avg("energy")),
          artistDiversity: artistMap.size / tracks.length,
        });
      } catch {
        // partial failure is ok
      } finally {
        setLoading(false);
      }
    }
    analyze();
  }, [tracks]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2500,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 540,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <TrendingUp size={20} color="var(--accent)" />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Playlist Insights</h2>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <div className="spinner" />
          </div>
        ) : !insights ? (
          <p className="text-secondary">Could not load audio features.</p>
        ) : (
          <>
            {/* Overview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Tracks", value: insights.trackCount },
                { label: "Duration", value: `${Math.round(insights.totalDuration / 60000)} min` },
                { label: "BPM (avg)", value: Math.round(insights.avgTempo) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--bg-tertiary)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Mood + energy */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "var(--bg-tertiary)", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Mood</div>
                <div style={{ fontWeight: 700 }}>{insights.moodLabel}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Valence {Math.round(insights.avgValence * 100)}%
                </div>
              </div>
              <div style={{ background: "var(--bg-tertiary)", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Energy</div>
                <div style={{ fontWeight: 700 }}>{insights.energyLabel}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Energy {Math.round(insights.avgEnergy * 100)}%
                </div>
              </div>
            </div>

            {/* Bars */}
            {[
              { label: "Energy", val: insights.avgEnergy, color: "#e2251f" },
              { label: "Danceability", val: insights.avgDanceability, color: "#7ed321" },
              { label: "Mood (Valence)", val: insights.avgValence, color: "#f5a623" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span style={{ color, fontWeight: 600 }}>{Math.round(val * 100)}%</span>
                </div>
                <div style={{ height: 4, background: "var(--bg-tertiary)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${val * 100}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            ))}

            {/* Top artists */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Music size={14} /> Top Artists
              </div>
              {insights.topArtists.map(({ name, count }) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{name}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{count} tracks</span>
                </div>
              ))}
            </div>

            {/* Warnings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.topArtists[0]?.count / insights.trackCount > 0.35 && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(226,165,33,0.1)", borderRadius: 8, padding: "10px 12px" }}>
                  <AlertCircle size={16} color="#e2a521" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13 }}>
                    <strong>{insights.topArtists[0].name}</strong> makes up {Math.round(insights.topArtists[0].count / insights.trackCount * 100)}% of the playlist — consider diversifying.
                  </span>
                </div>
              )}
              {dupeCount > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(226,33,52,0.1)", borderRadius: 8, padding: "10px 12px" }}>
                  <AlertCircle size={16} color="var(--danger, #e22134)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13 }}>
                    {dupeCount} duplicate track{dupeCount > 1 ? "s" : ""} detected.
                  </span>
                </div>
              )}
              {insights.artistDiversity >= 0.6 && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(29,185,84,0.1)", borderRadius: 8, padding: "10px 12px" }}>
                  <CheckCircle size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13 }}>Great artist diversity — {Math.round(insights.artistDiversity * 100)}% unique artists.</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
