import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practitioner.role !== "doctor" && practitioner.role !== "admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const slug = String(body.slug || "").trim().toLowerCase();
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const articleBody = String(body.body || "").trim();
  const readMinutes = Math.max(1, Math.round(Number(body.read_minutes) || 5));

  if (!slug || !SLUG_RE.test(slug))
    return NextResponse.json(
      { error: "slug must be kebab-case (lowercase letters, numbers, hyphens)" },
      { status: 400 },
    );
  if (!title)
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!category)
    return NextResponse.json({ error: "category is required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("articles").upsert(
    {
      slug,
      title,
      category,
      excerpt: excerpt || null,
      body: articleBody || null,
      read_minutes: readMinutes,
      published: true,
    },
    { onConflict: "slug" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
