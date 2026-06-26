import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Modules a brand-new practice gets switched on by default (minus always-on "core").
const DEFAULT_ON = ["scheduling", "billing", "portal", "reports", "engagement"];

/**
 * Public new-practice onboarding. Creates a tenant end-to-end with the
 * service-role admin client (bypasses RLS for cross-tenant creation):
 *   1. auth user  2. practice  3. owner practitioner  4. practice_settings row.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const practiceName = String(body.practiceName ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").trim();
  const password = String(body.password ?? "");

  if (!practiceName || !slug || !ownerName || !ownerEmail || !password) {
    return NextResponse.json(
      { error: "practiceName, slug, ownerName, ownerEmail and password are all required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 1. Create the auth user.
  const { data: authData, error: aErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
  });

  if (aErr && !/already.*registered/i.test(aErr.message)) {
    return NextResponse.json({ error: aErr.message }, { status: 400 });
  }

  const authUserId = authData?.user?.id;
  if (!authUserId) {
    return NextResponse.json(
      { error: "Could not create or resolve the owner account. The email may already be registered." },
      { status: 400 },
    );
  }

  // 2. Insert the practice.
  const { data: practice, error: pErr } = await admin
    .from("practices")
    .insert({
      slug,
      name: practiceName,
      plan: "starter",
      region: "us",
      modules: [...DEFAULT_ON],
    })
    .select("id")
    .single();

  if (pErr) {
    if (pErr.code === "23505") {
      return NextResponse.json({ error: "slug taken" }, { status: 409 });
    }
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const practiceId = practice.id as string;

  // 3. Insert the owner practitioner.
  const { error: prErr } = await admin.from("practitioners").insert({
    practice_id: practiceId,
    auth_user_id: authUserId,
    name: ownerName,
    email: ownerEmail,
    role: "doctor",
    active: true,
  });

  if (prErr) {
    return NextResponse.json({ error: prErr.message }, { status: 500 });
  }

  // 4. Default practice_settings row (best-effort — schema may vary).
  try {
    await admin
      .from("practice_settings")
      .insert({ practice_id: practiceId, name: practiceName });
  } catch {
    // ignore — settings can be filled in later from the dashboard.
  }

  return NextResponse.json({ ok: true, practiceId });
}
