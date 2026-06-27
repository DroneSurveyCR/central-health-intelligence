import type { AnySupabaseClient } from "@/lib/connectors/types";

// In-app notification delivery. Works with either the RLS session client (a
// logged-in staff/patient write auto-fills practice_id via the column default)
// or the ADMIN/service-role client (cron, alert engine) — in which case
// practiceId MUST be passed explicitly because there is no auth.uid().

export type Severity = "info" | "warn" | "urgent";

export type NotifyInput = {
  // Required for admin/service-role writes; optional for session-client writes
  // (the DB default current_practice_id() fills it in for a logged-in caller).
  practiceId?: string;
  practitionerId?: string | null; // address to one practitioner (else practice-wide)
  patientId?: string | null; // address to one patient (else practice-wide)
  kind: string; // 'alert' | 'nudge' | 'system' | ...
  title: string;
  body?: string | null;
  link?: string | null;
  severity?: Severity;
  // Alert-fatigue tuning: only urgent should interrupt. Caller may force it,
  // but the default below derives it from severity.
  interrupt?: boolean;
  // Reuse the alert dedup_key for daily idempotency. When set, a duplicate insert
  // for the same (practice, dedup_key) is a silent no-op (unique index 23505).
  dedupKey?: string | null;
};

export type NotifyResult = { created: boolean; id: string | null };

/**
 * Insert a single notification row. Idempotent when `dedupKey` is supplied
 * (duplicate-key errors are swallowed, mirroring the alert engine). Returns
 * { created } so callers can chain email delivery only on a genuinely new row.
 */
export async function notify(
  client: AnySupabaseClient,
  input: NotifyInput,
): Promise<NotifyResult> {
  const severity: Severity = input.severity ?? "info";
  // Tuning rule: interrupting notifications are urgent-only unless forced.
  const interrupt = input.interrupt ?? severity === "urgent";

  const row: Record<string, unknown> = {
    recipient_practitioner_id: input.practitionerId ?? null,
    recipient_patient_id: input.patientId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    severity,
    interrupt,
    dedup_key: input.dedupKey ?? null,
  };
  // Admin writes have no auth.uid() -> the column default can't resolve, so the
  // explicit practice_id is required. Session writes may omit it (default fills).
  if (input.practiceId) row.practice_id = input.practiceId;

  const { data, error } = await client
    .from("notifications")
    .insert(row)
    .select("id")
    .maybeSingle();

  // 23505 = duplicate dedup_key for this practice -> already notified today. Any
  // other error is also swallowed so one bad row never aborts a batch sweep.
  if (error) return { created: false, id: null };
  return { created: true, id: (data?.id as string | undefined) ?? null };
}

/**
 * Optional out-of-band email for a notification, via Resend. NO-OP (and never
 * throws) unless BOTH RESEND_API_KEY and a from address (RESEND_FROM) are set.
 * Uses fetch directly (no SDK dependency). Keep PHI out of subject/body.
 *
 * Returns { skipped:true } when email is not configured or the recipient is
 * empty, so the in-app notification still stands on its own.
 */
export async function deliverEmail(params: {
  to: string | null | undefined;
  subject: string;
  text: string;
}): Promise<{ id: string | null; skipped: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  // Degrade gracefully: missing key OR missing from-address OR missing recipient
  // -> do nothing. The app keeps working with in-app notifications only.
  if (!key || !from || !params.to) return { id: null, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });
    if (!res.ok) return { id: null, skipped: true };
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { id: data?.id ?? null, skipped: false };
  } catch {
    // Network/Resend outage must never break the request path that triggered it.
    return { id: null, skipped: true };
  }
}
