/**
 * Discord Rich Presence Plugin
 *
 * Shows your current track in Discord status.
 * Note: Real Discord RPC requires a native helper app.
 * This demo plugin shows the pattern — adapt to your setup.
 */

const plugin = {
  name: "discord-rpc",
  version: "1.0.0",

  activate(api) {
    console.log("[discord-rpc] Plugin activated");

    // Listen for track changes
    const unsubscribe = api.events.on("track:change", (track) => {
      const presence = {
        type: "TRACK_CHANGE",
        track: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        album: track.album.name,
        albumArt: track.album.images?.[0]?.url,
        duration: track.duration_ms,
      };

      // In a real implementation, you'd POST to a local helper app:
      // fetch("http://localhost:6969/presence", { method: "POST", body: JSON.stringify(presence) })

      console.log("[discord-rpc] Now playing:", presence.track, "by", presence.artist);

      // Store last track
      api.storage.set("lastTrack", presence);
    });

    // Register a sidebar slot showing current track info
    api.ui.registerSlot({
      id: "discord-rpc:status",
      slot: "sidebar-bottom",
      render() {
        const el = document.createElement("div");
        el.style.cssText = `
          padding: 8px 12px;
          font-size: 11px;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 6px;
        `;
        el.innerHTML = `
          <span style="width:8px;height:8px;border-radius:50%;background:#5865F2;display:inline-block;"></span>
          Discord RPC Active
        `;
        return el;
      },
    });

    // Return cleanup
    plugin._unsubscribe = unsubscribe;
  },

  deactivate() {
    plugin._unsubscribe?.();
    console.log("[discord-rpc] Plugin deactivated");
  },

  _unsubscribe: null,
};

export default plugin;
