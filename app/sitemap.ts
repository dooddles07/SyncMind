import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sync-mind-three.vercel.app";

// Only the landing page for now. Everything under (app) sits behind auth that doesn't
// exist yet, and once it does it's private user data — it shouldn't be indexed then
// either. Revisit when there's something public worth listing beyond "/".
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
