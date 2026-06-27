import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDelta } from "@/lib/briefing/buildDelta";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Morning-briefing generator (Vercel Cron). For each practice, finds patients
// with an appointment in the next 48h and caches a rule-based "what changed
// since last visit" briefing into patient_briefings. Protected by CRON_SECRET.
// Idempotent: upserts on (patient_id, briefing_date), so safe to over-run.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const qs = new URL(request.url).searchParams.get("secret");
  return auth === secret || qs === secret;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function run() {
  const admin = createAdminClient();
  const briefingDate = todayISO();

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let generated = 0;
  let practices = 0;

  const { data: practiceRows } = await admin.from("practices").select("id");
  for (const practice of practiceRows ?? []) {
    const practiceId = practice.id as string;
    practices += 1;

    // Patients with an upcoming appointment in this practice (next 48h).
    const { data: appts } = await admin
      .from("appointments")
      .select("patient_id")
      .eq("practice_id", practiceId)
      .gte("start_time", now.toISOString())
      .lte("start_time", in48h.toISOString())
      .neq("status", "cancelled")
      .is("deleted_at", null);

    const patientIds = Array.from(
      new Set((appts ?? []).map((a) => a.patient_id as string).filter(Boolean)),
    );

    for (const patientId of patientIds) {
      try {
        const { summary, deltas, talkingPoints } = await buildDelta(admin, patientId);
        const { error } = await admin
          .from("patient_briefings")
          .upsert(
            {
              practice_id: practiceId, // explicit on service-role write
              patient_id: patientId,
              briefing_date: briefingDate,
              summary,
              deltas,
              talking_points: talkingPoints,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "patient_id,briefing_date" },
          );
        if (!error) generated += 1;
      } catch {
        // Never let one patient's data abort the whole run.
      }
    }
  }

  return { generated, practices };
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}
