import { useEffect, useState } from "react";
import { spotify } from "../api/client";
import type { AudioFeatures } from "../types";

interface Props {
  trackId: string;
  compact?: boolean;
}

const FEATURES: { key: keyof AudioFeatures; label: string; color: string }[] = [
  { key: "energy", label: "Energy", color: "#e2251f" },
  { key: "valence", label: "Mood", color: "#f5a623" },
  { key: "danceability", label: "Dance", color: "#7ed321" },
  { key: "acousticness", label: "Acoustic", color: "#4a90e2" },
];

export default function AudioFeaturesBar({ trackId, compact = false }: Props) {
  const [features, setFeatures] = useState<AudioFeatures | null>(null);

  useEffect(() => {
    if (!trackId) return;
    setFeatures(null);
    spotify.getAudioFeatures(trackId).then(setFeatures).catch(() => {});
  }, [trackId]);

  if (!features) {
    return compact ? null : (
      <div style={{ height: compact ? 20 : 48, opacity: 0.3, fontSize: 12, color: "var(--text-muted)" }}>
        Loading audio features…
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
          {Math.round(features.tempo)} BPM
        </span>
        {FEATURES.map(({ key, label, color }) => {
          const val = features[key] as number;
          return (
            <span key={key} style={{ fontSize: 11 }}>
              <span style={{ color: "var(--text-muted)" }}>{label} </span>
              <span style={{ color, fontWeight: 700 }}>{Math.round(val * 100)}%</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Audio features</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {Math.round(features.tempo)} BPM · {features.key !== undefined ? ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][features.key] : "?"}{features.mode ? " maj" : " min"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FEATURES.map(({ key, label, color }) => {
          const val = features[key] as number;
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{Math.round(val * 100)}%</span>
              </div>
              <div
                style={{
                  height: 4, background: "rgba(255,255,255,0.1)",
                  borderRadius: 2, overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%", width: `${val * 100}%`,
                    background: color, borderRadius: 2,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
