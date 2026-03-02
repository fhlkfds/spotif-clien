import { Music } from "lucide-react";

export default function LoginPage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("auth_error");

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #121212)",
        color: "var(--text-primary, #fff)",
        gap: 32,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Music size={60} color="var(--accent, #1db954)" />
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>SpotClient</h1>
          <p style={{ color: "var(--text-secondary, #b3b3b3)", fontSize: 16 }}>
            Your open Spotify client for Linux
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-secondary, #181818)",
          padding: "40px",
          borderRadius: 12,
          maxWidth: 420,
          width: "100%",
          margin: "0 16px",
          boxShadow: "var(--card-shadow)",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: 8, fontSize: 24 }}>Welcome back</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14 }}>
          Connect your Spotify account to get started
        </p>

        {error && (
          <div
            style={{
              background: "rgba(226,33,52,0.15)",
              border: "1px solid var(--danger, #e22134)",
              color: "var(--danger, #e22134)",
              padding: "10px 16px",
              borderRadius: 6,
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            Authentication failed: {error.replace(/_/g, " ")}
          </div>
        )}

        <a
          href="/api/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 32px",
            background: "var(--accent, #1db954)",
            color: "#000",
            fontWeight: 700,
            fontSize: 16,
            borderRadius: 40,
            textDecoration: "none",
            transition: "transform 0.1s, background 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-hover, #1ed760)";
            e.currentTarget.style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent, #1db954)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Music size={20} />
          Login with Spotify
        </a>

        <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted)" }}>
          Requires a Spotify account. Premium required for full playback.
        </p>
      </div>

      <div style={{ display: "flex", gap: 32, fontSize: 13, color: "var(--text-muted)" }}>
        <span>Custom Themes</span>
        <span>•</span>
        <span>Plugin System</span>
        <span>•</span>
        <span>Download via yt-dlp</span>
        <span>•</span>
        <span>Listening Stats</span>
      </div>
    </div>
  );
}
