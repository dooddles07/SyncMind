"use client";

// This is the outermost error boundary — it replaces the entire tree, including the
// root layout, so it renders its own <html>/<body> and cannot rely on Tailwind (the
// thing that crashed) or any provider from app/layout.tsx. Plain inline styles only.

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#0b1412",
          color: "#f5f7f6",
        }}
      >
        <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>SyncMind</p>
        <div>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: "0.9375rem", color: "#a8b3b0", margin: 0, maxWidth: "40ch" }}>
            The app hit a problem it couldn&apos;t recover from on its own. Reloading
            usually fixes it.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "0.375rem",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#0b1412",
            backgroundColor: "#3fc9bc",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
