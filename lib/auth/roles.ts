import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export type StaffRole = "doctor" | "admin" | "assistant";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The practitioner row for the logged-in user, or null if they aren't staff. */
export async function getCurrentPractitioner() {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase
    .from("practitioners")
    .select("id, name, email, role, active, practice_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data && data.active ? data : null;
}

/** The patient row for the logged-in user, or null. */
export async function getCurrentPatient() {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name, email, sex, practice_id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

/** Guard for (staff) routes. Optionally restrict to specific roles. */
export async function requireStaff(roles?: StaffRole[]) {
  const p = await getCurrentPractitioner();
  if (!p) redirect("/login");

  // MFA step-up: if the user has a factor enrolled but hasn't satisfied it this
  // session, force verification. Users with no factor are unaffected (nextLevel
  // stays "aal1"), so existing logins keep working.
  const supabase = await createClient();
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")
    redirect("/mfa");

  if (roles && !roles.includes(p.role as StaffRole)) redirect("/focus");
  return p;
}

/** Guard for (patient) routes. */
export async function requirePatient() {
  const p = await getCurrentPatient();
  if (!p) redirect("/login");
  return p;
}

/**
 * API-route guard for staff. Page routes get the MFA AAL2 step-up via requireStaff(); API
 * routes authorized only by getCurrentPractitioner() previously skipped it, so a passwords-only
 * (aal1) session could hit sensitive endpoints directly. This enforces the same step-up.
 * Returns a discriminated union — on failure, return `.response`; on success, use `.practitioner`.
 */
export async function requireStaffApi(roles?: StaffRole[]) {
  const p = await getCurrentPractitioner();
  if (!p)
    return { ok: false as const, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")
    return { ok: false as const, response: NextResponse.json({ error: "mfa_required" }, { status: 403 }) };

  if (roles && !roles.includes(p.role as StaffRole))
    return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };

  return { ok: true as const, practitioner: p };
}
