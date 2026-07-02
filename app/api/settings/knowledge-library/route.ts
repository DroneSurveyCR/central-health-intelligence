import { requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { seedDefaultLibrary } from "@/lib/knowledge/seedDefaultLibrary";
import { NextResponse } from "next/server";

/** Doctor/admin imports a default knowledge library into their own practice's articles. */
export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;
  if (!["doctor", "admin"].includes(me.role))
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const { librarySlug } = (await request.json().catch(() => ({}))) as { librarySlug?: string };
  if (!librarySlug) return NextResponse.json({ error: "missing librarySlug" }, { status: 400 });

  const supabase = await createClient();
  const { data: practice, error: readErr } = await supabase.from("practices").select("id").limit(1).maybeSingle();
  if (readErr || !practice)
    return NextResponse.json({ error: readErr?.message ?? "no practice" }, { status: 400 });

  const result = await seedDefaultLibrary(supabase, practice.id as string, librarySlug);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, count: result.count });
}
