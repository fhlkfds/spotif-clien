import type { SpotifyTrack, PlaybackState } from "../types";

export type PluginEvent =
  | "track:change"
  | "player:play"
  | "player:pause"
  | "player:seek"
  | "app:ready";

export type PluginEventPayload = {
  "track:change": SpotifyTrack;
  "player:play": SpotifyTrack;
  "player:pause": PlaybackState;
  "player:seek": number;
  "app:ready": void;
};

export interface UISlot {
  id: string;
  slot: "sidebar-bottom" | "player-extra" | "now-playing-extra";
  render: () => HTMLElement;
}

export interface Plugin {
  name: string;
  version: string;
  activate: (api: PluginAPI) => void;
  deactivate?: () => void;
}

export interface PluginAPI {
  events: {
    on<E extends PluginEvent>(
      event: E,
      handler: (payload: PluginEventPayload[E]) => void
    ): () => void;
    emit<E extends PluginEvent>(event: E, payload: PluginEventPayload[E]): void;
  };
  ui: {
    registerSlot: (slot: UISlot) => () => void;
    getSlots: () => UISlot[];
  };
  storage: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
  };
  player: {
    getCurrentTrack: () => SpotifyTrack | null;
    getPlaybackState: () => PlaybackState | null;
  };
}

type EventHandlers = {
  [E in PluginEvent]?: Set<(payload: PluginEventPayload[E]) => void>;
};

class PluginSystemImpl {
  private plugins: Map<string, Plugin> = new Map();
  private handlers: EventHandlers = {};
  private slots: UISlot[] = [];
  private storage: Map<string, Map<string, unknown>> = new Map();
  private currentTrack: SpotifyTrack | null = null;
  private currentPlayback: PlaybackState | null = null;

  updatePlayerState(track: SpotifyTrack | null, playback: PlaybackState | null) {
    this.currentTrack = track;
    this.currentPlayback = playback;
  }

  emit<E extends PluginEvent>(event: E, payload: PluginEventPayload[E]) {
    const set = this.handlers[event] as
      | Set<(p: PluginEventPayload[E]) => void>
      | undefined;
    set?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`Plugin event handler error (${event}):`, err);
      }
    });
  }

  private makeAPI(pluginName: string): PluginAPI {
    if (!this.storage.has(pluginName)) {
      this.storage.set(pluginName, new Map());
    }
    const pluginStorage = this.storage.get(pluginName)!;

    return {
      events: {
        on: (event, handler) => {
          if (!this.handlers[event]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.handlers as any)[event] = new Set();
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.handlers[event] as Set<any>).add(handler);
          return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.handlers[event] as Set<any>)?.delete(handler);
          };
        },
        emit: (event, payload) => this.emit(event, payload),
      },
      ui: {
        registerSlot: (slot) => {
          this.slots.push(slot);
          // Trigger re-render
          window.dispatchEvent(new CustomEvent("plugin:slots-changed"));
          return () => {
            const idx = this.slots.findIndex((s) => s.id === slot.id);
            if (idx !== -1) this.slots.splice(idx, 1);
            window.dispatchEvent(new CustomEvent("plugin:slots-changed"));
          };
        },
        getSlots: () => [...this.slots],
      },
      storage: {
        get: (key) => pluginStorage.get(key),
        set: (key, value) => pluginStorage.set(key, value),
      },
      player: {
        getCurrentTrack: () => this.currentTrack,
        getPlaybackState: () => this.currentPlayback,
      },
    };
  }

  async loadPlugin(name: string, bundleUrl: string): Promise<boolean> {
    if (this.plugins.has(name)) return true;

    try {
      // Dynamic import from URL
      const module = await import(/* @vite-ignore */ bundleUrl) as { default?: Plugin };
      const plugin = module.default;
      if (!plugin || typeof plugin.activate !== "function") {
        console.error(`Plugin ${name} has no default export with activate()`);
        return false;
      }

      const api = this.makeAPI(name);
      plugin.activate(api);
      this.plugins.set(name, plugin);
      console.log(`Plugin loaded: ${name} v${plugin.version}`);
      return true;
    } catch (err) {
      console.error(`Failed to load plugin ${name}:`, err);
      return false;
    }
  }

  unloadPlugin(name: string) {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    try {
      plugin.deactivate?.();
    } catch (err) {
      console.error(`Plugin deactivate error (${name}):`, err);
    }
    this.plugins.delete(name);
    // Remove slots registered by this plugin (by convention: slot id starts with plugin name)
    this.slots = this.slots.filter((s) => !s.id.startsWith(`${name}:`));
    window.dispatchEvent(new CustomEvent("plugin:slots-changed"));
  }

  getLoadedPlugins(): string[] {
    return [...this.plugins.keys()];
  }
}

export const PluginSystem = new PluginSystemImpl();

// Expose on window for plugins to use
declare global {
  interface Window {
    __SpotifyClientPluginSystem: PluginSystemImpl;
  }
}
window.__SpotifyClientPluginSystem = PluginSystem;
