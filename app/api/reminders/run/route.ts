import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email/resend";
import { reminderEmail } from "@/lib/email/templates";
import { dueReminders } from "@/lib/reminders/window";
import { notify } from "@/lib/notifications/create";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// Host-agnostic cron target. Authorize ONLY via the x-cron-secret header,
// compared in constant time to avoid timing side-channels.
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) return false;
  const provided = request.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!isAuthorized(request))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("practice_settings")
    .select("name")
    .limit(1)
    .maybeSingle();
  const practiceName = settings?.name ?? "Your clinic";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const now = Date.now();
  const horizon = new Date(now + 25 * 3600 * 1000).toISOString();
  const windows = [
    { key: "h24", minutes: 1440 },
    { key: "h2", minutes: 120 },
  ];

  const { data: appts } = await admin
    .from("appointments")
    .select("id, start_time, modality, reminders_sent_json, patient_id, practice_id, patients(email)")
    .eq("status", "scheduled")
    .gte("start_time", new Date(now).toISOString())
    .lte("start_time", horizon);

  let sent = 0;
  for (const a of appts ?? []) {
    const minutesUntil = (new Date(a.start_time).getTime() - now) / 60000;
    const flags = (a.reminders_sent_json ?? {}) as Record<string, boolean>;
    const patient = (Array.isArray(a.patients) ? a.patients[0] : a.patients) as
      | { email?: string }
      | null;
    if (!patient?.email) continue;

    for (const key of dueReminders(minutesUntil, flags, windows)) {
      const { subject, text } = reminderEmail({
        practiceName,
        whenText: new Date(a.start_time).toLocaleString(),
        locationText: a.modality === "online" ? "Online" : "",
        appUrl,
      });
      try {
        const r = await sendReminderEmail(patient.email, subject, text);
        flags[key] = true;
        await admin.from("appointments").update({ reminders_sent_json: flags }).eq("id", a.id);
        await admin.from("email_log").insert({
          patient_id: a.patient_id,
          template: `reminder_${key}`,
          resend_id: r.id,
          status: r.skipped ? "skipped" : "sent",
        });

        // In-app delivery alongside the email. Admin (service-role) client => no
        // auth.uid(), so practice_id MUST be passed explicitly. Idempotent via a
        // dedupKey scoped to (appointment, reminder window) so re-runs of the cron
        // never double-notify the patient for the same appointment+window.
        if (a.practice_id) {
          await notify(admin, {
            practiceId: a.practice_id as string,
            patientId: a.patient_id as string,
            kind: "reminder",
            title: "Upcoming appointment",
            body: `${practiceName} · ${new Date(a.start_time).toLocaleString()}`,
            link: "/appointments",
            severity: "info",
            dedupKey: `reminder:${a.id}:${key}`,
          });
        }

        sent++;
      } catch {
        await admin.from("email_log").insert({
          patient_id: a.patient_id,
          template: `reminder_${key}`,
          status: "error",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, scanned: (appts ?? []).length, sent });
}

export async function POST(request: Request) {
  return run(request);
}
