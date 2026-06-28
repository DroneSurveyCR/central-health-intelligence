import { requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { MODULES, ALWAYS_ON } from "@/lib/modules/manifest";
import type { ModuleId } from "@/lib/modules/types";
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

  if (!moduleId || !(moduleId in MODULES))
    return NextResponse.json({ error: "unknown module" }, { status: 400 });
  if (ALWAYS_ON.includes(moduleId as ModuleId))
    return NextResponse.json({ error: "cannot change core module" }, { status: 400 });

  const supabase = await createClient();
  // RLS returns only the caller's practice row.
  const { data: practice, error: readErr } = await supabase
    .from("practices")
    .select("id, modules")
    .limit(1)
    .maybeSingle();
  if (readErr || !practice)
    return NextResponse.json({ error: readErr?.message ?? "no practice" }, { status: 400 });

  const current = new Set<string>((practice.modules as string[]) ?? []);
  if (enabled) {
    current.add(moduleId);
    for (const dep of MODULES[moduleId as ModuleId].dependsOn ?? []) current.add(dep);
  } else {
    current.delete(moduleId);
  }
  const next = [...current];

  const { error: updErr } = await supabase
    .from("practices")
    .update({ modules: next })
    .eq("id", practice.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, modules: next });
}
