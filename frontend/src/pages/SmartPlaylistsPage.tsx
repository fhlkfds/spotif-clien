import { useEffect, useState } from "react";
import { Zap, Plus, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { smartPlaylists, spotify } from "../api/client";
import { useStore } from "../store/useStore";
import type { SmartPlaylist, SmartPlaylistRule } from "../types";

type RuleField = SmartPlaylistRule["field"];
type RuleOp = "lt" | "gt" | "lte" | "gte" | "eq";

const FIELD_OPTIONS: { value: RuleField; label: string; ops: RuleOp[]; hint: string }[] = [
  { value: "play_count", label: "Play count", ops: ["lt", "gt", "lte", "gte"], hint: "Number of times played" },
  { value: "energy", label: "Energy (0–1)", ops: ["lt", "gt"], hint: "0=low, 1=high energy" },
  { value: "valence", label: "Mood/Valence (0–1)", ops: ["lt", "gt"], hint: "0=sad, 1=happy" },
  { value: "tempo", label: "BPM", ops: ["lt", "gt"], hint: "Beats per minute" },
  { value: "danceability", label: "Danceability (0–1)", ops: ["lt", "gt"], hint: "0=not, 1=very danceable" },
  { value: "liked_within_days", label: "Liked within N days", ops: ["eq"], hint: "Tracks played in last N days" },
  { value: "skipped", label: "Skipped", ops: ["eq"], hint: "Whether the track was skipped" },
];

const OP_LABELS: Record<string, string> = {
  lt: "is less than", gt: "is greater than",
  lte: "≤", gte: "≥", eq: "equals",
};

export default function SmartPlaylistsPage() {
  const { deviceId } = useStore();
  const [lists, setLists] = useState<SmartPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [rules, setRules] = useState<SmartPlaylistRule[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Record<number, { track_name: string; artist_name: string; play_count: number }[]>>({});

  useEffect(() => {
    smartPlaylists.list().then(setLists).finally(() => setLoading(false));
  }, []);

  function addRule() {
    setRules((prev) => [...prev, { field: "play_count", op: "lt", value: 5 } as SmartPlaylistRule]);
  }

  function updateRule(idx: number, patch: Partial<SmartPlaylistRule>) {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } as SmartPlaylistRule : r));
  }

  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  }

  async function createList() {
    if (!newName.trim()) return;
    const pl = await smartPlaylists.create(newName.trim(), newDesc.trim(), rules);
    setLists((prev) => [pl, ...prev]);
    setCreating(false);
    setNewName(""); setNewDesc(""); setRules([]);
  }

  async function deleteList(id: number) {
    await smartPlaylists.delete(id);
    setLists((prev) => prev.filter((p) => p.id !== id));
  }

  async function loadTracks(id: number) {
    if (tracks[id]) {
      setExpanded(expanded === id ? null : id);
      return;
    }
    const data = await smartPlaylists.getTracks(id);
    setTracks((prev) => ({ ...prev, [id]: data }));
    setExpanded(id);
  }

  async function playAll(id: number) {
    const data = tracks[id] ?? (await smartPlaylists.getTracks(id));
    if (!data || data.length === 0) return;
    // Queue all tracks
    for (const t of data.slice(0, 20)) {
      const searchData = await spotify.search(`${t.track_name} ${t.artist_name}`, "track").catch(() => null);
      const uri = searchData?.tracks?.items?.[0]?.uri;
      if (uri) await spotify.addToQueue(uri).catch(() => {});
    }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Zap size={24} color="var(--accent)" />
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Smart Playlists</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> New Smart Playlist
        </button>
      </div>
      <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
        Auto-generated playlists based on your listening habits and audio features.
      </p>

      {/* Create form */}
      {creating && (
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--accent)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>New Smart Playlist</h3>
          <input
            type="text"
            placeholder="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: "100%", marginBottom: 8, fontSize: 14 }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{ width: "100%", marginBottom: 16, fontSize: 14 }}
          />

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Rules</div>
            {rules.map((rule, idx) => {
              const fieldMeta = FIELD_OPTIONS.find((f) => f.value === rule.field);
              return (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    value={rule.field}
                    onChange={(e) => updateRule(idx, { field: e.target.value as RuleField, op: "lt", value: 5 })}
                    style={{ fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                  >
                    {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <select
                    value={rule.op}
                    onChange={(e) => updateRule(idx, { op: e.target.value as RuleOp })}
                    style={{ fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                  >
                    {(fieldMeta?.ops ?? ["lt"]).map((op) => (
                      <option key={op} value={op}>{OP_LABELS[op]}</option>
                    ))}
                  </select>
                  {rule.field === "skipped" ? (
                    <select
                      value={String(rule.value)}
                      onChange={(e) => updateRule(idx, { value: e.target.value === "true" })}
                      style={{ fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={Number(rule.value)}
                      onChange={(e) => updateRule(idx, { value: Number(e.target.value) })}
                      step={rule.field === "energy" || rule.field === "valence" || rule.field === "danceability" ? 0.05 : 1}
                      min={0}
                      style={{ width: 80, fontSize: 13, padding: "6px 8px" }}
                    />
                  )}
                  <button onClick={() => removeRule(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger, #e22134)" }}>
                    <Trash2 size={14} />
                  </button>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fieldMeta?.hint}</span>
                </div>
              );
            })}
            <button className="btn btn-secondary" style={{ fontSize: 13, marginTop: 4 }} onClick={addRule}>
              <Plus size={12} /> Add rule
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={createList} disabled={!newName.trim()}>Create</button>
            <button className="btn btn-secondary" onClick={() => { setCreating(false); setRules([]); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {lists.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
          <Zap size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No smart playlists yet.</p>
          <p style={{ fontSize: 13 }}>Create one to auto-populate tracks based on rules.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lists.map((pl) => (
            <div key={pl.id} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div
                style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onClick={() => loadTracks(pl.id)}
              >
                <Zap size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{pl.name}</div>
                  {pl.description && <div className="text-secondary" style={{ fontSize: 12 }}>{pl.description}</div>}
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {pl.rules.length} rule{pl.rules.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); playAll(pl.id); }}
                  className="btn btn-primary"
                  style={{ padding: "6px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Play size={12} fill="currentColor" color="#000" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteList(pl.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger, #e22134)", padding: 4 }}
                >
                  <Trash2 size={16} />
                </button>
                {expanded === pl.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {expanded === pl.id && tracks[pl.id] && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
                  {tracks[pl.id].length === 0 ? (
                    <p className="text-secondary" style={{ padding: "12px 16px", fontSize: 13 }}>No matching tracks found.</p>
                  ) : (
                    tracks[pl.id].map((t, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px" }}>
                        <span className="text-muted" style={{ fontSize: 12, width: 20, flexShrink: 0, textAlign: "right" }}>{idx + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.track_name}</div>
                          <div className="text-secondary" style={{ fontSize: 12 }}>{t.artist_name}</div>
                        </div>
                        <span className="text-muted" style={{ fontSize: 12 }}>{t.play_count}×</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
