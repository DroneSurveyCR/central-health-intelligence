import { getSessionUser } from "@/lib/auth/roles";
import { isSuperAdminEmail } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULES, ALWAYS_ON } from "@/lib/modules/manifest";
import type { ModuleId } from "@/lib/modules/types";
import { NextResponse } from "next/server";

/**
 * Super-admin module override for ANY tenant. Mirrors the per-tenant toggle in
 * app/api/settings/modules but: (1) gated to the platform super-admin (email
 * allowlist), (2) uses the service-role client to write any practice by id, and
 * (3) takes an explicit practiceId. Same always-on guard + dependency auto-add.
 */
export async function PATCH(request: Request) {
  const { user } = await getSessionUser();
  if (!user || !isSuperAdminEmail(user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { practiceId, moduleId, enabled } = (await request.json().catch(() => ({}))) as {
    practiceId?: string;
    moduleId?: string;
    enabled?: boolean;
  };

  if (!practiceId) return NextResponse.json({ error: "missing practiceId" }, { status: 400 });
  if (!moduleId || !(moduleId in MODULES))
    return NextResponse.json({ error: "unknown module" }, { status: 400 });
  if (ALWAYS_ON.includes(moduleId as ModuleId))
    return NextResponse.json({ error: "cannot change core module" }, { status: 400 });

  const admin = createAdminClient();
  const { data: practice, error: readErr } = await admin
    .from("practices")
    .select("id, modules")
    .eq("id", practiceId)
    .maybeSingle();
  if (readErr || !practice)
    return NextResponse.json({ error: readErr?.message ?? "practice not found" }, { status: 404 });

  const current = new Set<string>((practice.modules as string[]) ?? []);
  if (enabled) {
    current.add(moduleId);
    for (const dep of MODULES[moduleId as ModuleId].dependsOn ?? []) current.add(dep);
  } else {
    current.delete(moduleId);
  }
  const next = [...current];

  const { error: updErr } = await admin
    .from("practices")
    .update({ modules: next })
    .eq("id", practiceId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, modules: next });
}
