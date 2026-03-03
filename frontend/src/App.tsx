import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth, plugins as pluginsApi, userSettings } from "./api/client";
import { useStore } from "./store/useStore";
import { useTheme } from "./hooks/useTheme";
import { useSpotifyPlayer } from "./hooks/useSpotifyPlayer";
import { usePlaybackPoller } from "./hooks/usePlaybackPoller";
import { useOfflinePlayer } from "./hooks/useOfflinePlayer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { PluginSystem } from "./plugins/PluginSystem";
import Layout from "./components/Layout";
import LoginPage from "./pages/Login";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import PlaylistView from "./pages/PlaylistView";
import AlbumView from "./pages/AlbumView";
import ArtistView from "./pages/ArtistView";
import NewReleasesPage from "./pages/NewReleasesPage";
import BookmarksPage from "./pages/BookmarksPage";
import TagPage from "./pages/TagPage";
import HistoryPage from "./pages/HistoryPage";
import SmartPlaylistsPage from "./pages/SmartPlaylistsPage";
import DiscoveryPage from "./pages/DiscoveryPage";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";

export default function App() {
  const { isAuthenticated, isPremium, setAuth, setUserSettings } = useStore();
  useTheme();
  useSpotifyPlayer();
  usePlaybackPoller();
  useOfflinePlayer();
  useKeyboardShortcuts();

  useEffect(() => {
    auth.getMe().then((data) => {
      if (data.authenticated) {
        setAuth(data.user, data.isPremium);
      }
    }).catch(() => {});
  }, [setAuth]);

  // Load user settings after auth
  useEffect(() => {
    if (!isAuthenticated) return;
    userSettings.get().then(setUserSettings).catch(() => {});
  }, [isAuthenticated, setUserSettings]);

  // Load enabled plugins after auth
  useEffect(() => {
    if (!isAuthenticated) return;

    Promise.all([pluginsApi.list(), pluginsApi.listAvailable()])
      .then(([userPlugins, availablePlugins]) => {
        const enabledNames = new Set(
          (userPlugins as { plugin_name: string; enabled: boolean }[])
            .filter((p) => p.enabled)
            .map((p) => p.plugin_name)
        );

        availablePlugins
          .filter((p: { name: string }) => enabledNames.has(p.name))
          .forEach((p: { name: string }) => {
            PluginSystem.loadPlugin(p.name, pluginsApi.bundleUrl(p.name));
          });

        PluginSystem.emit("app:ready", undefined as never);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <KeyboardShortcutsModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/playlist/:id" element={<PlaylistView />} />
        <Route path="/album/:id" element={<AlbumView />} />
        <Route path="/artist/:id" element={<ArtistView />} />
        <Route path="/new-releases" element={<NewReleasesPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/tag/:name" element={<TagPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/smart-playlists" element={<SmartPlaylistsPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
