import { requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { setPracticeModule } from "@/lib/modules/setModule";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;
  if (!["doctor", "admin"].includes(me.role))
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const { moduleId, enabled } = (await request
    .json()
    .catch(() => ({}))) as { moduleId?: string; enabled?: boolean };

  const supabase = await createClient();
  // RLS returns only the caller's practice row.
  const { data: practice, error: readErr } = await supabase
    .from("practices")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (readErr || !practice)
    return NextResponse.json({ error: readErr?.message ?? "no practice" }, { status: 400 });

  // Same shared helper the super-admin override uses — one source of truth for
  // module validation + dependency resolution. RLS keeps this scoped to own practice.
  const result = await setPracticeModule(supabase, practice.id as string, String(moduleId), Boolean(enabled));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, modules: result.modules });
}
