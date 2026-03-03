import { X, Keyboard } from "lucide-react";
import { useStore } from "../store/useStore";
import { DEFAULT_SHORTCUTS } from "../hooks/useKeyboardShortcuts";

export default function KeyboardShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useStore();

  if (!shortcutsOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }}
      onClick={() => setShortcutsOpen(false)}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Keyboard size={22} color="var(--accent)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Keyboard Shortcuts</h2>
          <button
            onClick={() => setShortcutsOpen(false)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(DEFAULT_SHORTCUTS).map(([key, action]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--bg-tertiary)",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{action}</span>
              <kbd
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  minWidth: 28,
                  textAlign: "center",
                }}
              >
                {key === " " ? "Space" : key === "?" ? "Shift+/" : key === "ArrowUp" ? "Shift+↑" : key === "ArrowDown" ? "Shift+↓" : key}
              </kbd>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          Shortcuts don't work when typing in text fields · Press <kbd style={{ fontSize: 11, fontFamily: "monospace", background: "var(--bg-tertiary)", padding: "1px 5px", borderRadius: 3 }}>?</kbd> to toggle
        </p>
      </div>
    </div>
  );
}
