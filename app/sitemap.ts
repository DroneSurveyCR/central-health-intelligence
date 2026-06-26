import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = "https://healthsync-app-eight.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now },
    { url: `${BASE_URL}/login`, lastModified: now },
    { url: `${BASE_URL}/about`, lastModified: now },
    { url: `${BASE_URL}/learn`, lastModified: now },
  ];

  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("published", true);

    articleRoutes = (data ?? [])
      .filter((a): a is { slug: string; updated_at: string | null } => Boolean(a?.slug))
      .map((a) => ({
        url: `${BASE_URL}/learn/${a.slug}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : now,
      }));
  } catch {
    // If the admin client/env is unavailable, fall back to static routes only.
    articleRoutes = [];
  }

  return [...staticRoutes, ...articleRoutes];
}
