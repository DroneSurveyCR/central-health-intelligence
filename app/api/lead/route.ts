import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { sendReminderEmail } from "@/lib/email/resend";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTENTS = new Set(["demo", "pricing", "get_started"]);
const clip = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));

/**
 * Public marketing intake. Captures name/email/phone + chosen vertical + the
 * options they need. Stores in the `leads` table (service-role) and notifies the
 * team by email (best-effort). Returns ok if EITHER the store or the email lands,
 * so a lead is never silently dropped.
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(`lead:${ip}`, 10, 3600)))
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });

  const intent = INTENTS.has(String(body.intent)) ? String(body.intent) : "demo";
  const options: string[] = Array.isArray(body.options)
    ? body.options.filter((o: unknown) => typeof o === "string").slice(0, 30).map((o: string) => o.slice(0, 80))
    : [];

  const lead = {
    name: name.slice(0, 200),
    email: email.slice(0, 200),
    phone: clip(body.phone, 40),
    clinic: clip(body.clinic, 200),
    vertical: clip(body.vertical, 80),
    intent,
    options,
    message: clip(body.message, 2000),
    source: clip(body.source, 40) ?? "site",
  };

  let stored = false;
  try {
    const { error } = await createAdminClient().from("leads").insert(lead);
    stored = !error;
  } catch {
    /* table may not exist yet — fall back to email below */
  }

  let emailed = false;
  try {
    const to = process.env.LEADS_EMAIL || "hello@healthintelligency.com";
    const text = [
      `New ${intent.replace("_", " ")} request`,
      ``,
      `Name:    ${lead.name}`,
      `Email:   ${lead.email}`,
      `Phone:   ${lead.phone ?? "—"}`,
      `Clinic:  ${lead.clinic ?? "—"}`,
      `Vertical:${lead.vertical ?? "—"}`,
      `Needs:   ${options.join(", ") || "—"}`,
      ``,
      lead.message ?? "",
    ].join("\n");
    const r = await sendReminderEmail(to, `New lead: ${lead.name} (${intent})`, text);
    emailed = !r.skipped;
  } catch {
    /* email optional */
  }

  if (!stored && !emailed) {
    // Neither path captured it — surface a soft error so the lead retries.
    return NextResponse.json({ error: "Could not record your request. Please email hello@healthintelligency.com." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
