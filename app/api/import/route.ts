import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

type IncomingRow = {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  sex?: unknown;
  dob?: unknown;
};

type ResultRow = {
  email: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

const SEX_VALUES = ["male", "female", "other", "undisclosed"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practitioner.role !== "admin" && practitioner.role !== "doctor")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const incoming = Array.isArray(body.rows) ? (body.rows as IncomingRow[]) : null;
  if (!incoming || incoming.length === 0)
    return NextResponse.json({ error: "no rows provided" }, { status: 400 });

  const admin = createAdminClient();
  const results: ResultRow[] = [];

  for (const raw of incoming) {
    const first_name = String(raw.first_name ?? "").trim();
    const last_name = String(raw.last_name ?? "").trim();
    const email = String(raw.email ?? "").trim();
    const sexRaw = String(raw.sex ?? "").trim().toLowerCase();
    const dob = String(raw.dob ?? "").trim();

    // Validate (server-side; never trust the client).
    if (!email || !EMAIL_RE.test(email)) {
      results.push({ email: email || "(blank)", status: "error", message: "invalid email" });
      continue;
    }
    if (!first_name && !last_name) {
      results.push({ email, status: "error", message: "name required" });
      continue;
    }
    if (sexRaw && !SEX_VALUES.includes(sexRaw)) {
      results.push({ email, status: "error", message: "invalid sex value" });
      continue;
    }
    if (dob && !DOB_RE.test(dob)) {
      results.push({ email, status: "error", message: "invalid dob (use YYYY-MM-DD)" });
      continue;
    }

    // Skip if a patient with this email already exists (case-insensitive, not soft-deleted).
    const { data: existing, error: lookupErr } = await admin
      .from("patients")
      .select("id")
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupErr) {
      results.push({ email, status: "error", message: lookupErr.message });
      continue;
    }
    if (existing) {
      results.push({ email, status: "skipped", message: "email already exists" });
      continue;
    }

    const { error: insertErr } = await admin.from("patients").insert({
      first_name,
      last_name,
      email,
      sex: sexRaw || null,
      dob: dob || null,
      status_cached: "new",
    });

    if (insertErr) {
      results.push({ email, status: "error", message: insertErr.message });
    } else {
      results.push({ email, status: "created" });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errored = results.filter((r) => r.status === "error").length;

  await logAudit({
    action: "create",
    resource: "patients",
    resourceId: `import:${created} created, ${skipped} skipped, ${errored} error`,
  });

  return NextResponse.json({ ok: true, results });
}
