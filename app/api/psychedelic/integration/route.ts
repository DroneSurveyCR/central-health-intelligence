import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Trim a string field; returns null when absent/empty. */
function asOptionalText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const sessionId = String(body.session_id || "");
  const daysPost = parseOptionalNumber(body.days_post);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!sessionId)
    return NextResponse.json({ error: "missing session_id" }, { status: 400 });
  if (daysPost == null)
    return NextResponse.json({ error: "missing days_post" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("psychedelic_integration_notes")
    .insert({
      patient_id: patientId,
      session_id: sessionId,
      days_post: daysPost,
      insights: asOptionalText(body.insights),
      challenges: asOptionalText(body.challenges),
      behavioral_changes: asOptionalText(body.behavioral_changes),
      mood_rating: parseOptionalNumber(body.mood_rating),
      sleep_quality: parseOptionalNumber(body.sleep_quality),
      follow_up_plan: asOptionalText(body.follow_up_plan),
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "psychedelic_integration_notes",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
