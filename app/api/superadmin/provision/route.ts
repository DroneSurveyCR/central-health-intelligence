import { requireSuperAdminApi } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULES, DEFAULT_ON } from "@/lib/modules/manifest";
import type { ModuleId } from "@/lib/modules/types";
import { NextResponse } from "next/server";

const VALID_MODULE_IDS = new Set(Object.keys(MODULES));
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_VERTICALS = new Set(["integrative", "longevity", "peptide", "psychedelic", "functional", "womens", "chiropractic"]);

function resolveModules(requested: unknown): ModuleId[] {
  const set = new Set<string>(DEFAULT_ON as string[]);
  if (Array.isArray(requested)) {
    for (const id of requested) if (typeof id === "string" && VALID_MODULE_IDS.has(id)) set.add(id);
  }
  return Array.from(set) as ModuleId[];
}

/**
 * Super-admin provisioning: create a client's instance end-to-end and return a
 * HANDOFF link (magic-link) the admin sends to the client to log in — no password
 * set by the admin. Mirrors `/api/onboarding`'s creation steps but admin-gated and
 * passwordless.
 */
export async function POST(request: Request) {
  const gate = await requireSuperAdminApi();
  if (!gate.ok) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const practiceName = String(body.practiceName ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").trim();
  const verticalRaw = String(body.vertical ?? "").trim();
  const vertical = VALID_VERTICALS.has(verticalRaw) ? verticalRaw : null;
  const modules = resolveModules(body.modules);

  if (!practiceName || !slug || !ownerName || !ownerEmail)
    return NextResponse.json({ error: "practiceName, slug, ownerName and ownerEmail are required" }, { status: 400 });
  if (!SLUG_RE.test(slug))
    return NextResponse.json({ error: "slug must be 1–40 chars: lowercase letters, numbers, hyphens" }, { status: 400 });
  if (!EMAIL_RE.test(ownerEmail))
    return NextResponse.json({ error: "invalid owner email" }, { status: 400 });
  if (practiceName.length > 200 || ownerName.length > 200)
    return NextResponse.json({ error: "practiceName / ownerName too long" }, { status: 400 });

  const admin = createAdminClient();

  // 1. Create the owner auth user WITHOUT a password (they log in via the handoff link).
  const { data: authData, error: aErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    email_confirm: true,
  });
  if (aErr && !/already.*registered/i.test(aErr.message))
    return NextResponse.json({ error: aErr.message }, { status: 400 });
  const authUserId = authData?.user?.id;
  if (!authUserId)
    return NextResponse.json({ error: "Could not create the owner account (email may already be registered)." }, { status: 400 });

  // 2. Practice.
  const { data: practice, error: pErr } = await admin
    .from("practices")
    .insert({ slug, name: practiceName, plan: "starter", region: "us", vertical, modules })
    .select("id")
    .single();
  if (pErr) {
    if (pErr.code === "23505") return NextResponse.json({ error: "slug taken" }, { status: 409 });
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  const practiceId = practice.id as string;

  // 3. Owner practitioner.
  const { error: prErr } = await admin.from("practitioners").insert({
    practice_id: practiceId,
    auth_user_id: authUserId,
    name: ownerName,
    email: ownerEmail,
    role: "doctor",
    active: true,
  });
  if (prErr) return NextResponse.json({ error: prErr.message }, { status: 500 });

  // 4. Default practice_settings row (best-effort).
  try {
    await admin.from("practice_settings").insert({ practice_id: practiceId, name: practiceName });
  } catch {
    /* settings can be filled in later */
  }

  // 5. The handoff: a magic-link the admin sends to the client to log in.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://healthsync-cloud-mu.vercel.app";
  let handoffLink: string | null = null;
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerEmail,
    options: { redirectTo: `${baseUrl}/focus` },
  });
  handoffLink = linkData?.properties?.action_link ?? null;

  return NextResponse.json({ ok: true, practiceId, handoffLink });
}
