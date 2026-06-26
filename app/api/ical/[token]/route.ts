import { createAdminClient } from "@/lib/supabase/admin";
import { buildICal } from "@/lib/ical/feed";

/** Tokenized, non-PHI calendar feed a patient can subscribe to (no login). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: patient } = await admin
    .from("patients")
    .select("id")
    .eq("ical_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!patient) return new Response("Not found", { status: 404 });

  const { data: settings } = await admin
    .from("practice_settings")
    .select("name")
    .limit(1)
    .maybeSingle();

  const { data: appts } = await admin
    .from("appointments")
    .select("ical_uid, start_time, end_time, type, modality, status")
    .eq("patient_id", patient.id)
    .is("deleted_at", null)
    .order("start_time");

  const body = buildICal(settings?.name ?? "Appointments", appts ?? []);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
