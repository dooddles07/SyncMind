import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";

// Inter Tight for display and headings. The negative tracking in the type scale
// was written for this face, not for Inter.
export const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Timestamps and transcript metadata. Tabular figures matter here.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = [
  interTight.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(" ");
