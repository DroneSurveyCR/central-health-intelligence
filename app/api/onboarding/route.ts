import { createAdminClient } from "@/lib/supabase/admin";
import { MODULES, DEFAULT_ON } from "@/lib/modules/manifest";
import type { ModuleId } from "@/lib/modules/types";
import { NextResponse } from "next/server";

const VALID_MODULE_IDS = new Set(Object.keys(MODULES));
const VALID_VERTICALS = new Set([
  "integrative", "longevity", "peptide", "psychedelic", "functional", "womens",
]);

/**
 * Resolve the final module set for a new practice:
 *   - always include DEFAULT_ON (and always-on core, which is in DEFAULT_ON)
 *   - add any client-requested modules that are valid manifest ids
 * Dedupes; ignores anything not in the manifest.
 */
function resolveModules(requested: unknown): ModuleId[] {
  const set = new Set<string>(DEFAULT_ON as string[]);
  if (Array.isArray(requested)) {
    for (const id of requested) {
      if (typeof id === "string" && VALID_MODULE_IDS.has(id)) set.add(id);
    }
  }
  return Array.from(set) as ModuleId[];
}

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

  const verticalRaw = String(body.vertical ?? "").trim();
  const vertical = VALID_VERTICALS.has(verticalRaw) ? verticalRaw : null;
  const modules = resolveModules(body.modules);

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
      vertical,
      modules,
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
