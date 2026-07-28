import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sync-mind-three.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /share/* also carries a noindex meta tag per-page (docs/SECURITY-PRIVACY.md
      // §5) — this is belt and suspenders, not the only guard.
      disallow: ["/share/", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
