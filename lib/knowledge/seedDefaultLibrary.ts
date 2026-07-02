import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LIBRARIES } from "./defaultLibraries";

export type SeedResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Import a default knowledge library into the CALLER's own practice as real
 * `articles` rows (published, so they immediately ground both the doctor AI
 * producers and the patient assistant — both already read published articles).
 *
 * Idempotent: slugs are deterministic per (library, practice), so re-running
 * this for the same practice upserts the same rows rather than duplicating.
 * Pass the RLS-scoped (user) client — the insert lands in the caller's own
 * practice via the practice_id default, matching every other staff-write path.
 */
export async function seedDefaultLibrary(
  supabase: SupabaseClient,
  practiceId: string,
  librarySlug: string,
): Promise<SeedResult> {
  const lib = DEFAULT_LIBRARIES[librarySlug];
  if (!lib) return { ok: false, error: `Unknown library: ${librarySlug}` };

  const suffix = practiceId.replace(/-/g, "").slice(0, 8);
  const rows = lib.articles.map((a, i) => ({
    slug: `${a.slugBase}-${suffix}`,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    body: a.body,
    read_minutes: a.read_minutes,
    published: true,
    sort_order: 1000 + i, // default-library articles sort after hand-authored ones
  }));

  const { error } = await supabase.from("articles").upsert(rows, { onConflict: "slug" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: rows.length };
}
