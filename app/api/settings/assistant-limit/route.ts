import { requireStaffApi } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Staff-facing (doctor/admin) control of their OWN practice's patient-assistant
 * daily question cap. Mirrors /api/settings/modules: RLS-scoped read of "my
 * practice" via the user-scoped client, no cross-tenant reach — unlike the
 * super-admin override, which can target any practiceId.
 */
export async function PATCH(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;
  if (!["doctor", "admin"].includes(me.role))
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const { dailyLimit } = (await request.json().catch(() => ({}))) as { dailyLimit?: number };
  const n = Number(dailyLimit);
  if (!Number.isFinite(n) || n < 1 || n > 500)
    return NextResponse.json({ error: "dailyLimit must be between 1 and 500" }, { status: 400 });

  const supabase = await createClient();
  // RLS returns only the caller's own practice row.
  const { data: practice, error: readErr } = await supabase
    .from("practices")
    .select("id, settings")
    .limit(1)
    .maybeSingle();
  if (readErr || !practice)
    return NextResponse.json({ error: readErr?.message ?? "no practice" }, { status: 400 });

  const settings = { ...((practice.settings as Record<string, unknown>) ?? {}), assistant_daily_limit: Math.floor(n) };
  const { error: uErr } = await supabase.from("practices").update({ settings }).eq("id", practice.id as string);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, dailyLimit: Math.floor(n) });
}
