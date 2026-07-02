import { requireSuperAdminApi } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Super-admin override of the patient assistant's daily question cap for ANY
 * tenant. Stored at practices.settings.assistant_daily_limit (same field the
 * staff-facing /api/settings/assistant-limit writes for their own practice —
 * this route just isn't RLS-scoped, so it can target any practiceId).
 */
export async function PATCH(request: Request) {
  const gate = await requireSuperAdminApi();
  if (!gate.ok) return gate.response;

  const { practiceId, dailyLimit } = (await request.json().catch(() => ({}))) as {
    practiceId?: string;
    dailyLimit?: number;
  };
  if (!practiceId) return NextResponse.json({ error: "missing practiceId" }, { status: 400 });
  const n = Number(dailyLimit);
  if (!Number.isFinite(n) || n < 1 || n > 500)
    return NextResponse.json({ error: "dailyLimit must be between 1 and 500" }, { status: 400 });

  const admin = createAdminClient();
  const { data: practice, error: rErr } = await admin
    .from("practices")
    .select("settings")
    .eq("id", practiceId)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!practice) return NextResponse.json({ error: "practice not found" }, { status: 404 });

  const settings = { ...((practice.settings as Record<string, unknown>) ?? {}), assistant_daily_limit: Math.floor(n) };
  const { error: uErr } = await admin.from("practices").update({ settings }).eq("id", practiceId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, dailyLimit: Math.floor(n) });
}
