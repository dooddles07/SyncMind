import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SyncMind — Meetings in. Momentum out.";

// next/og's Satori renderer can't read CSS custom properties or oklch(), so these are
// the dark-mode Room Tone tokens converted to static hex once, matching the same
// conversion already done for app/icon.svg.
const BG = "#0b1412";
const SAID = "#f5a93f";
const DONE = "#3fc9bc";
const MUTED = "#a8b3b0";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          backgroundColor: BG,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width={72} height={72} viewBox="0 0 32 32" fill="none">
            <path d="M6.6 5V20.5" stroke={SAID} strokeWidth={3} strokeLinecap="round" />
            <path d="M11.9 9V20.5" stroke={SAID} strokeWidth={3} strokeLinecap="round" />
            <path d="M17.2 13V20.5" stroke={SAID} strokeWidth={3} strokeLinecap="round" />
            <path
              d="M22.5 16.5v6.4a3.6 3.6 0 0 1-3.6 3.6"
              stroke={DONE}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path d="M4.7 26.5h22.6" stroke={DONE} strokeWidth={3} strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 76, fontWeight: 700, color: "#f5f7f6" }}>SyncMind</span>
        </div>
        <span style={{ fontSize: 32, color: MUTED }}>Meetings in. Momentum out.</span>
      </div>
    ),
    { ...size },
  );
}
