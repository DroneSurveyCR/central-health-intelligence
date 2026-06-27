import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_STATUS = ["active", "completed", "paused"];

/**
 * Advance a modality course: bump sessions_done (relative `advance` or absolute
 * `sessions_done`), update next_session_at, and/or change status. Tenant-scoped
 * by RLS — the update only matches rows in the caller's practice.
 */
export async function PATCH(request: Request) {
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = await createClient();

  // Read current row first so we can clamp sessions_done to [0, sessions_total].
  const { data: course, error: readErr } = await supabase
    .from("modality_courses")
    .select("id, patient_id, sessions_total, sessions_done")
    .eq("id", id)
    .maybeSingle();

  if (readErr)
    return NextResponse.json({ error: readErr.message }, { status: 400 });
  if (!course)
    return NextResponse.json({ error: "course not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};

  let nextDone: number | null = null;
  if (body.sessions_done != null && Number.isFinite(Number(body.sessions_done))) {
    nextDone = Math.round(Number(body.sessions_done));
  } else if (body.advance != null && Number.isFinite(Number(body.advance))) {
    nextDone = course.sessions_done + Math.round(Number(body.advance));
  }
  if (nextDone != null) {
    const total = Number(course.sessions_total) || 0;
    patch.sessions_done = Math.max(0, total > 0 ? Math.min(nextDone, total) : nextDone);
  }

  if (typeof body.status === "string" && VALID_STATUS.includes(body.status))
    patch.status = body.status;

  if ("next_session_at" in body) {
    patch.next_session_at =
      typeof body.next_session_at === "string" && body.next_session_at
        ? body.next_session_at
        : null;
  }

  // Auto-complete when the final session is logged (unless caller set status).
  if (
    patch.sessions_done != null &&
    patch.status == null &&
    Number(course.sessions_total) > 0 &&
    Number(patch.sessions_done) >= Number(course.sessions_total)
  ) {
    patch.status = "completed";
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("modality_courses")
    .update(patch)
    .eq("id", id)
    .select("id, patient_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "update",
    resource: "modality_courses",
    resourceId: id,
    patientId: data?.patient_id ?? null,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
