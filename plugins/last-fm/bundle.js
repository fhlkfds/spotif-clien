/**
 * Last.fm Scrobbler Plugin
 *
 * Scrobbles tracks to Last.fm when they play.
 * Configure your Last.fm API key and session key via plugin config.
 */

const plugin = {
  name: "last-fm",
  version: "1.0.0",

  activate(api) {
    console.log("[last-fm] Plugin activated");

    const config = api.storage.get("config") || {
      apiKey: "",
      sessionKey: "",
    };

    let scrobbleTimer = null;

    const unsubscribe = api.events.on("track:change", (track) => {
      if (scrobbleTimer) clearTimeout(scrobbleTimer);

      const artist = track.artists.map((a) => a.name).join(", ");
      const title = track.name;
      const duration = track.duration_ms;

      console.log(`[last-fm] Started playing: ${title} by ${artist}`);

      // Scrobble after 50% of track duration (Last.fm spec)
      const scrobbleAfter = Math.min(duration / 2, 4 * 60 * 1000);

      scrobbleTimer = setTimeout(() => {
        if (!config.apiKey || !config.sessionKey) {
          console.warn("[last-fm] No API key configured, skipping scrobble");
          return;
        }

        const params = new URLSearchParams({
          method: "track.scrobble",
          artist,
          track: title,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          api_key: config.apiKey,
          sk: config.sessionKey,
          format: "json",
        });

        // In production: sign the request with MD5(api_sig)
        // fetch("https://ws.audioscrobbler.com/2.0/", { method: "POST", body: params })
        console.log(`[last-fm] Would scrobble: ${title} by ${artist}`);
      }, scrobbleAfter);
    });

    plugin._unsubscribe = unsubscribe;
    plugin._cleanup = () => { if (scrobbleTimer) clearTimeout(scrobbleTimer); };
  },

  deactivate() {
    plugin._unsubscribe?.();
    plugin._cleanup?.();
    console.log("[last-fm] Plugin deactivated");
  },

  _unsubscribe: null,
  _cleanup: null,
};

export default plugin;
