import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/today",
        "/plan",
        "/progress",
        "/results",
        "/body",
        "/patients",
        "/focus",
        "/analytics",
        "/settings",
        "/api",
        "/auth",
        "/calendar",
        "/billing",
        "/orders",
      ],
    },
    sitemap: "https://healthsync-app-eight.vercel.app/sitemap.xml",
  };
}
