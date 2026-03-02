import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth, plugins as pluginsApi } from "./api/client";
import { useStore } from "./store/useStore";
import { useTheme } from "./hooks/useTheme";
import { useSpotifyPlayer } from "./hooks/useSpotifyPlayer";
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

export default function App() {
  const { isAuthenticated, isPremium, setAuth } = useStore();
  useTheme();
  useSpotifyPlayer();

  useEffect(() => {
    auth.getMe().then((data) => {
      if (data.authenticated) {
        setAuth(data.user, data.isPremium);
      }
    }).catch(() => {});
  }, [setAuth]);

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

        // Fire app:ready
        PluginSystem.emit("app:ready", undefined as never);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/playlist/:id" element={<PlaylistView />} />
        <Route path="/album/:id" element={<AlbumView />} />
        <Route path="/artist/:id" element={<ArtistView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
