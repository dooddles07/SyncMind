import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncMind",
  description:
    "Upload a recording. Get minutes, action items, a follow-up email, and calendar dates.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required: next-themes writes the class before React hydrates
    <html lang="en" suppressHydrationWarning>
      <body className={fontVariables}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
