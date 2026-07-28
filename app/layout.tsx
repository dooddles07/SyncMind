import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { MotionProvider } from "@/components/motion-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Without this, Next resolves relative metadata URLs (like the auto-detected
// app/opengraph-image.tsx) against http://localhost:3000, so the og:image tag on the
// live site would point at localhost instead of the deployed URL.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sync-mind-three.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "SyncMind — Turn any meeting recording into notes you can send",
    template: "%s · SyncMind",
  },
  description:
    "Drop in a recording. Get back a transcript, written notes, a to-do list, a follow-up email ready to send, and every deadline on your calendar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-md"
          >
            Skip to main content
          </a>
          <MotionProvider>{children}</MotionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
