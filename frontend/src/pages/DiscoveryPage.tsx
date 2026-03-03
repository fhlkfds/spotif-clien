import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Zap, Gem, Play, TrendingUp } from "lucide-react";
import { spotify, lastfm } from "../api/client";
import { useStore } from "../store/useStore";
import type { SpotifyTrack, SpotifyArtist } from "../types";

interface HiddenGem {
  track: SpotifyTrack;
  popularity: number;
}

export default function DiscoveryPage() {
  const { deviceId } = useStore();
  const navigate = useNavigate();

  const [relatedArtists, setRelatedArtists] = useState<SpotifyArtist[]>([]);
  const [hiddenGems, setHiddenGems] = useState<HiddenGem[]>([]);
  const [seedTracks, setSeedTracks] = useState<SpotifyTrack[]>([]);
  const [radioTracks, setRadioTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [whyPanel, setWhyPanel] = useState<{ track: SpotifyTrack; reasons: string[] } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get top artists + tracks for seeds
        const [topArtists, topTracks] = await Promise.all([
          spotify.getTopItems("artists", "short_term"),
          spotify.getTopItems("tracks", "short_term"),
        ]);

        const seedArtistIds = (topArtists?.items ?? []).slice(0, 3).map((a: SpotifyArtist) => a.id);
        const seedTrackIds = (topTracks?.items ?? []).slice(0, 5).map((t: SpotifyTrack) => t.id);
        setSeedTracks((topTracks?.items ?? []).slice(0, 5));

        // Related artists from top artist
        if (seedArtistIds[0]) {
          const related = await spotify.getRelatedArtists(seedArtistIds[0]);
          setRelatedArtists(related?.artists?.slice(0, 12) ?? []);
        }

        // Song radio (recommendations from top tracks + artists)
        const recs = await spotify.getRecommendations({
          seed_tracks: seedTrackIds.slice(0, 3).join(","),
          seed_artists: seedArtistIds.slice(0, 2).join(","),
          limit: "20",
        });
        setRadioTracks(recs?.tracks ?? []);

        // Hidden gems: recommendations filtered by low popularity
        const gems = await spotify.getRecommendations({
          seed_artists: seedArtistIds.join(","),
          limit: "50",
        });
        const gemTracks = (gems?.tracks ?? [])
          .filter((t: SpotifyTrack) => (t.popularity ?? 100) < 40)
          .slice(0, 10)
          .map((t: SpotifyTrack) => ({ track: t, popularity: t.popularity ?? 0 }));
        setHiddenGems(gemTracks);
      } catch { /* ok */ }
      setLoading(false);
    }
    load();
  }, []);

  function buildWhyReasons(track: SpotifyTrack): string[] {
    const reasons: string[] = [];
    const seedArtistNames = seedTracks.flatMap((t) => t.artists.map((a) => a.name));
    const sharedArtists = track.artists.filter((a) => seedArtistNames.includes(a.name));
    if (sharedArtists.length > 0) {
      reasons.push(`Based on your love of ${sharedArtists[0].name}`);
    } else if (track.artists[0]) {
      reasons.push(`Recommended because of similar artists to your top picks`);
    }
    if ((track.popularity ?? 0) > 70) reasons.push("Popular track you may have missed");
    if ((track.popularity ?? 0) < 40) reasons.push("Hidden gem with lower mainstream popularity");
    reasons.push("Matches the sonic profile of your recent listening");
    return reasons;
  }

  const Section = ({ title, icon: Icon, children }: { title: string; icon: typeof Compass; children: React.ReactNode }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Icon size={20} color="var(--accent)" />
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ padding: "24px 24px 100px" }}>
      {/* Why You May Like panel */}
      {whyPanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setWhyPanel(null)}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 28,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <img src={whyPanel.track.album.images?.[0]?.url ?? ""} alt="" style={{ width: 56, height: 56, borderRadius: 6 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{whyPanel.track.name}</div>
                <div className="text-secondary" style={{ fontSize: 13 }}>{whyPanel.track.artists.map((a) => a.name).join(", ")}</div>
              </div>
            </div>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: "var(--accent)" }}>Why you may like this</div>
            {whyPanel.reasons.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>✦</span>
                <span className="text-secondary">{r}</span>
              </div>
            ))}
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => { spotify.addToQueue(whyPanel.track.uri).catch(() => {}); setWhyPanel(null); }}
            >
              Add to Queue
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Compass size={28} color="var(--accent)" />
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Discovery</h1>
          <p className="text-secondary" style={{ fontSize: 14 }}>New music based on your taste</p>
        </div>
      </div>

      {/* Song Radio */}
      <Section title="Song Radio" icon={Zap}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {radioTracks.slice(0, 10).map((track) => (
            <div
              key={track.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <img
                src={track.album.images?.[0]?.url ?? ""}
                alt=""
                style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{track.name}</div>
                <div className="truncate text-secondary" style={{ fontSize: 12 }}>
                  {track.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
              <button
                onClick={() => setWhyPanel({ track, reasons: buildWhyReasons(track) })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, fontSize: 11 }}
                title="Why you may like this"
              >
                <TrendingUp size={14} />
              </button>
              <button
                onClick={() => spotify.play({ context_uri: track.album.uri, offset: { uri: track.uri } }, deviceId ?? undefined).catch(() => spotify.addToQueue(track.uri))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
              >
                <Play size={16} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Related Artists Explorer */}
      <Section title="Related Artists Explorer" icon={Compass}>
        <div className="grid-cards">
          {relatedArtists.map((artist) => (
            <div
              key={artist.id}
              className="card"
              style={{ textAlign: "center", cursor: "pointer" }}
              onClick={() => navigate(`/artist/${artist.id}`)}
            >
              <img
                src={artist.images?.[0]?.url ?? ""}
                alt=""
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "50%", marginBottom: 10 }}
              />
              <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }}>{artist.name}</div>
              {artist.genres?.[0] && (
                <div className="text-muted" style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize" }}>
                  {artist.genres[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Hidden Gems */}
      <Section title="Hidden Gems" icon={Gem}>
        <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          Low-popularity tracks from artists you may love — under the radar.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {hiddenGems.length === 0 ? (
            <p className="text-secondary">No hidden gems found right now.</p>
          ) : hiddenGems.map(({ track, popularity }) => (
            <div
              key={track.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                borderRadius: 6,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <img
                src={track.album.images?.[0]?.url ?? ""}
                alt=""
                style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 600, fontSize: 14 }}>{track.name}</div>
                <div className="truncate text-secondary" style={{ fontSize: 12 }}>
                  {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: popularity < 20 ? "var(--accent)" : "var(--text-muted)",
                }}>
                  {popularity < 20 ? "💎 Rare" : "Underground"}
                </div>
                <div className="text-muted" style={{ fontSize: 10 }}>Pop: {popularity}</div>
              </div>
              <button
                onClick={() => spotify.addToQueue(track.uri).catch(() => {})}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, flexShrink: 0 }}
              >
                <Play size={16} />
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
