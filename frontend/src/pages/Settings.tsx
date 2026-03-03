import { useEffect, useState, useRef } from "react";
import {
  Palette, Puzzle, Download as DownloadIcon, Trash2, RefreshCw, Check,
  Radio, Play, Keyboard, Activity, Moon, Dumbbell, Car, Volume2,
} from "lucide-react";
import { themes, plugins as pluginsApi, downloads as downloadsApi, offline as offlineApi, userSettings } from "../api/client";
import { useTheme } from "../hooks/useTheme";
import { PluginSystem } from "../plugins/PluginSystem";
import { useStore } from "../store/useStore";
import { DEFAULT_SHORTCUTS } from "../hooks/useKeyboardShortcuts";
import type { ThemeInfo, PluginInfo, Download, OfflineTrack, ListeningMode } from "../types";

type Section = "themes" | "plugins" | "downloads" | "playback" | "shortcuts";

export default function Settings() {
  const [section, setSection] = useState<Section>("themes");
  const { currentTheme, changeTheme } = useTheme();
  const { setOfflineTrack, listeningMode, setListeningMode, setUserSettings, userSettings: storedSettings } = useStore();

  // Playback settings
  const [crossfadeMs, setCrossfadeMs] = useState(storedSettings?.crossfade_ms ?? 0);
  const [volumeNormalize, setVolumeNormalize] = useState(storedSettings?.volume_normalize ?? false);

  // Themes
  const [themeList, setThemeList] = useState<ThemeInfo[]>([]);
  const [customCss, setCustomCss] = useState("");
  const [showCssEditor, setShowCssEditor] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState(() => localStorage.getItem("bg-image") ?? "");
  const [bgOpacity, setBgOpacity] = useState(() => Number(localStorage.getItem("bg-opacity") ?? "0.3"));
  const [bgBlur, setBgBlur] = useState(() => Number(localStorage.getItem("bg-blur") ?? "0"));

  // Plugins
  const [availablePlugins, setAvailablePlugins] = useState<PluginInfo[]>([]);
  const [enabledPlugins, setEnabledPlugins] = useState<Set<string>>(new Set());

  // Downloads
  const [downloadList, setDownloadList] = useState<Download[]>([]);
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrack[]>([]);

  useEffect(() => {
    themes.list().then(setThemeList).catch(() => {});
    themes.getCurrent().then((d) => {
      if (d.custom_css) setCustomCss(d.custom_css);
    }).catch(() => {});
  }, []);

  // Apply background image settings
  useEffect(() => {
    const root = document.documentElement;
    if (bgImageUrl) {
      root.style.setProperty("--bg-image", `url(${bgImageUrl})`);
      root.style.setProperty("--bg-opacity", String(bgOpacity));
      root.style.setProperty("--bg-blur", `${bgBlur}px`);
      localStorage.setItem("bg-image", bgImageUrl);
      localStorage.setItem("bg-opacity", String(bgOpacity));
      localStorage.setItem("bg-blur", String(bgBlur));
    } else {
      root.style.removeProperty("--bg-image");
      localStorage.removeItem("bg-image");
    }
  }, [bgImageUrl, bgOpacity, bgBlur]);

  useEffect(() => {
    if (section === "plugins") {
      pluginsApi.listAvailable().then(setAvailablePlugins).catch(() => {});
      pluginsApi.list().then((list: { plugin_name: string; enabled: boolean }[]) => {
        setEnabledPlugins(new Set(list.filter((p) => p.enabled).map((p) => p.plugin_name)));
      }).catch(() => {});
    }
    if (section === "downloads") {
      downloadsApi.list().then(setDownloadList).catch(() => {});
      offlineApi.list().then(setOfflineTracks).catch(() => {});
    }
  }, [section]);

  async function handleThemeChange(name: string) {
    await changeTheme(name);
  }

  async function saveCustomCss() {
    await themes.setCurrent(currentTheme, customCss);
    let el = document.getElementById("custom-css") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "custom-css";
      document.head.appendChild(el);
    }
    el.textContent = customCss;
  }

  async function togglePlugin(name: string) {
    const nowEnabled = !enabledPlugins.has(name);
    await pluginsApi.toggle(name, nowEnabled);
    setEnabledPlugins((prev) => {
      const next = new Set(prev);
      if (nowEnabled) {
        next.add(name);
        PluginSystem.loadPlugin(name, pluginsApi.bundleUrl(name));
      } else {
        next.delete(name);
        PluginSystem.unloadPlugin(name);
      }
      return next;
    });
  }

  async function deleteDownload(id: number) {
    await downloadsApi.delete(id);
    setDownloadList((prev) => prev.filter((d) => d.id !== id));
    setOfflineTracks((prev) => prev.filter((d) => d.id !== id));
  }

  async function savePlaybackSettings() {
    const updated = await userSettings.update({
      listening_mode: listeningMode,
      crossfade_ms: crossfadeMs,
      volume_normalize: volumeNormalize,
    });
    setUserSettings(updated);
  }

  const LISTENING_MODES: { key: ListeningMode; label: string; desc: string; icon: typeof Activity }[] = [
    { key: "normal", label: "Normal", desc: "Default listening experience", icon: Activity },
    { key: "focus", label: "Focus", desc: "Minimal UI, no distractions. Good for work.", icon: Activity },
    { key: "gym", label: "Gym", desc: "High energy — boost volume, show BPM", icon: Dumbbell },
    { key: "driving", label: "Driving", desc: "Large controls, high contrast, fewer distractions", icon: Car },
    { key: "sleep", label: "Sleep", desc: "Dim UI, low volume, auto-pause after playlist ends", icon: Moon },
  ];

  const SECTIONS: { key: Section; label: string; icon: typeof Palette }[] = [
    { key: "themes", label: "Themes", icon: Palette },
    { key: "playback", label: "Playback", icon: Volume2 },
    { key: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { key: "plugins", label: "Plugins", icon: Puzzle },
    { key: "downloads", label: "Downloads", icon: DownloadIcon },
  ];

  return (
    <div style={{ padding: "24px 24px 100px", display: "grid", gridTemplateColumns: "200px 1fr", gap: 32 }}>
      {/* Sidebar nav */}
      <nav>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: section === key ? 700 : 400,
                background: section === key ? "var(--bg-tertiary)" : "transparent",
                color: section === key ? "var(--text-primary)" : "var(--text-secondary)",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div>
        {section === "themes" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Themes</h2>
            <p className="text-secondary" style={{ marginBottom: 24, fontSize: 14 }}>
              Choose a theme or upload your own CSS file.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {themeList.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    border: `2px solid ${currentTheme === theme.name ? "var(--accent)" : "var(--border)"}`,
                    background: "var(--bg-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    transition: "border-color 0.2s",
                    position: "relative",
                  }}
                >
                  {currentTheme === theme.name && (
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "var(--accent)",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={12} color="#000" />
                    </div>
                  )}
                  <div
                    style={{
                      width: "100%",
                      height: 60,
                      borderRadius: 4,
                      background: "linear-gradient(135deg, var(--bg-primary), var(--accent))",
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {theme.label}
                  </span>
                  {!theme.builtin && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Custom</span>
                  )}
                </button>
              ))}
            </div>

            {/* Background image */}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 10,
                padding: 20,
                border: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Background Image</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Paste image URL (https://...)"
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  style={{ flex: 1, fontSize: 13 }}
                />
                {bgImageUrl && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setBgImageUrl("")}
                    style={{ fontSize: 13 }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {bgImageUrl && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Opacity: {Math.round(bgOpacity * 100)}%
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(Number(e.target.value))}
                      style={{ display: "block", width: "100%", marginTop: 6, accentColor: "var(--accent)" }}
                    />
                  </label>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Blur: {bgBlur}px
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={bgBlur}
                      onChange={(e) => setBgBlur(Number(e.target.value))}
                      style={{ display: "block", width: "100%", marginTop: 6, accentColor: "var(--accent)" }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Custom CSS editor */}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 10,
                padding: 20,
                border: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h3 style={{ fontWeight: 700 }}>Custom CSS</h3>
                <button
                  className="btn-ghost"
                  onClick={() => setShowCssEditor(!showCssEditor)}
                  style={{ fontSize: 13 }}
                >
                  {showCssEditor ? "Hide" : "Edit"}
                </button>
              </div>
              {showCssEditor && (
                <>
                  <textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder={`:root {\n  --accent: #ff6b6b;\n  --bg-primary: #0a0a0a;\n}`}
                    rows={12}
                    style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn btn-primary" onClick={saveCustomCss}>
                      Save CSS
                    </button>
                    <button className="btn btn-secondary" onClick={() => setCustomCss("")}>
                      Clear
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Last.fm info */}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 10,
                padding: 20,
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Radio size={18} color="var(--accent)" />
                <h3 style={{ fontWeight: 700 }}>Last.fm Integration</h3>
              </div>
              <p className="text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                Last.fm tags and similar artist data require an API key configured in your{" "}
                <code style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>
                  .env
                </code>{" "}
                file as <code style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>
                  LASTFM_API_KEY
                </code>.
              </p>
              <a
                href="https://www.last.fm/api/account/create"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: 13, display: "inline-flex" }}
              >
                Get Last.fm API Key ↗
              </a>
            </div>
          </div>
        )}

        {section === "playback" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Playback</h2>
            <p className="text-secondary" style={{ marginBottom: 24, fontSize: 14 }}>
              Listening modes, crossfade, and volume settings.
            </p>

            {/* Listening modes */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 20, border: "1px solid var(--border)", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Listening Mode</h3>
              <p className="text-secondary" style={{ fontSize: 13, marginBottom: 16 }}>
                Adjusts the UI and experience to fit your context.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {LISTENING_MODES.map(({ key, label, desc, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setListeningMode(key)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: `2px solid ${listeningMode === key ? "var(--accent)" : "var(--border)"}`,
                      background: listeningMode === key ? "rgba(29,185,84,0.08)" : "var(--bg-tertiary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {listeningMode === key && (
                      <div style={{ position: "absolute", top: 8, right: 8, background: "var(--accent)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={10} color="#000" />
                      </div>
                    )}
                    <Icon size={18} color={listeningMode === key ? "var(--accent)" : "var(--text-secondary)"} style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Crossfade */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 20, border: "1px solid var(--border)", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Crossfade</h3>
              <p className="text-secondary" style={{ fontSize: 13, marginBottom: 16 }}>
                Blend between tracks. Works for offline/HTML5 audio. For Spotify streaming, set this in the Spotify app settings.
              </p>
              <label style={{ fontSize: 13 }}>
                <span className="text-secondary" style={{ display: "block", marginBottom: 8 }}>
                  Crossfade duration: <strong>{crossfadeMs / 1000}s</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={12000}
                  step={1000}
                  value={crossfadeMs}
                  onChange={(e) => setCrossfadeMs(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  <span>Off</span><span>12s</span>
                </div>
              </label>
            </div>

            {/* Volume normalization */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 20, border: "1px solid var(--border)", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Volume Normalization</h3>
                  <p className="text-secondary" style={{ fontSize: 13 }}>
                    Equalise volume levels between tracks. Applied to offline audio playback.
                  </p>
                </div>
                <button
                  onClick={() => setVolumeNormalize(!volumeNormalize)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: volumeNormalize ? "var(--accent)" : "var(--bg-tertiary)",
                    position: "relative", transition: "background 0.2s", flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute", top: 3,
                      left: volumeNormalize ? "calc(100% - 21px)" : 3,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "white", transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>
            </div>

            <button className="btn btn-primary" onClick={savePlaybackSettings}>
              Save Playback Settings
            </button>
          </div>
        )}

        {section === "shortcuts" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Keyboard Shortcuts</h2>
            <p className="text-secondary" style={{ marginBottom: 24, fontSize: 14 }}>
              Global shortcuts active when not typing. Press <kbd style={{ fontFamily: "monospace", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>?</kbd> anywhere to show this.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(DEFAULT_SHORTCUTS).map(([key, action]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{action}</span>
                  <kbd
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 13,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: "center",
                    }}
                  >
                    {key === " " ? "Space" : key === "?" ? "Shift+/" : key === "ArrowUp" ? "Shift+↑" : key === "ArrowDown" ? "Shift+↓" : key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "plugins" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Plugins</h2>
            <p className="text-secondary" style={{ marginBottom: 24, fontSize: 14 }}>
              Extend SpotClient with plugins. Drop plugin folders into the{" "}
              <code style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>
                ./plugins/
              </code>{" "}
              directory.
            </p>

            {availablePlugins.length === 0 ? (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <Puzzle size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>No plugins found.</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>
                  Drop a plugin folder with <code>manifest.json</code> and <code>bundle.js</code> into{" "}
                  <code>./plugins/</code>
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {availablePlugins.map((plugin) => {
                  const enabled = enabledPlugins.has(plugin.name);
                  return (
                    <div
                      key={plugin.name}
                      style={{
                        background: "var(--bg-secondary)",
                        border: `1px solid ${enabled ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 10,
                        padding: 20,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          {plugin.name}{" "}
                          <span className="text-muted" style={{ fontSize: 12, fontWeight: 400 }}>
                            v{plugin.version}
                          </span>
                        </div>
                        <div className="text-secondary" style={{ fontSize: 13 }}>
                          {plugin.description}
                        </div>
                        <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                          by {plugin.author}
                        </div>
                      </div>
                      <button
                        onClick={() => togglePlugin(plugin.name)}
                        style={{
                          padding: "8px 20px",
                          borderRadius: 20,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13,
                          background: enabled ? "var(--accent)" : "var(--bg-tertiary)",
                          color: enabled ? "#000" : "var(--text-secondary)",
                          transition: "all 0.2s",
                        }}
                      >
                        {enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {section === "downloads" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Downloads</h2>
              <button
                className="btn-ghost"
                onClick={() => {
                  downloadsApi.list().then(setDownloadList).catch(() => {});
                  offlineApi.list().then(setOfflineTracks).catch(() => {});
                }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="text-secondary" style={{ marginBottom: 24, fontSize: 14 }}>
              Track downloads via yt-dlp. Use the{" "}
              <DownloadIcon size={14} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
              button on any track in the player.
            </p>

            {/* Offline tracks (completed) */}
            {offlineTracks.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                  Available Offline ({offlineTracks.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {offlineTracks.map((dl) => (
                    <div
                      key={dl.id}
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--accent)",
                        borderRadius: 8,
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                          {dl.track_name}
                        </div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          {dl.artist_name} · {dl.format.toUpperCase()}
                          {dl.file_size && ` · ${(dl.file_size / 1_048_576).toFixed(1)} MB`}
                        </div>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: "6px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() => setOfflineTrack(dl.file_url)}
                        title="Play offline"
                      >
                        <Play size={14} fill="currentColor" color="#000" /> Play
                      </button>
                      <a
                        href={downloadsApi.fileUrl(dl.id)}
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 13 }}
                      >
                        Save
                      </a>
                      <button
                        className="btn-ghost"
                        onClick={() => deleteDownload(dl.id)}
                        style={{ color: "var(--danger)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All downloads */}
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>All Downloads</h3>
            {downloadList.length === 0 ? (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <DownloadIcon size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>No downloads yet.</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>
                  Click the download button in the player to save tracks.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {downloadList.map((dl) => (
                  <div
                    key={dl.id}
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                        {dl.track_name}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {dl.artist_name} · {dl.format.toUpperCase()}
                        {dl.file_size && ` · ${(dl.file_size / 1_048_576).toFixed(1)} MB`}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          dl.status === "completed"
                            ? "var(--accent-muted)"
                            : dl.status === "failed"
                            ? "rgba(226,33,52,0.15)"
                            : "var(--bg-tertiary)",
                        color:
                          dl.status === "completed"
                            ? "var(--accent)"
                            : dl.status === "failed"
                            ? "var(--danger)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {dl.status}
                    </div>

                    {dl.status === "completed" && (
                      <a
                        href={downloadsApi.fileUrl(dl.id)}
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 13 }}
                      >
                        Save
                      </a>
                    )}

                    <button
                      className="btn-ghost"
                      onClick={() => deleteDownload(dl.id)}
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
