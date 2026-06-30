import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/roles";

/**
 * Platform super-admin = the HealthSync operator who can see ALL tenants.
 * Identified by an email allowlist (env SUPERADMIN_EMAILS, comma-separated).
 * This is intentionally separate from per-practice `admin`/`doctor` roles —
 * a super-admin has no practice and the dashboard BYPASSES RLS via the admin
 * (service-role) client, so the gate must be strict.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  const allow = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

/** Guard for /superadmin routes. Redirects non-super-admins to /login. */
export async function requireSuperAdmin() {
  const { supabase, user } = await getSessionUser();
  if (!user || !isSuperAdminEmail(user.email)) redirect("/login");
  // This is the most privileged view in the system (all tenants, RLS bypassed). If the operator
  // has an MFA factor enrolled, require the AAL2 step-up before any cross-tenant read.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/mfa");
  return user;
}

/**
 * API-route version of the super-admin gate. Same checks as `requireSuperAdmin`
 * (email allowlist + MFA AAL2 step-up when a factor is enrolled) but returns a
 * JSON error response instead of redirecting — for the service-role admin
 * endpoints that bypass RLS, where the email gate is the only wall.
 */
export async function requireSuperAdminApi(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const { supabase, user } = await getSessionUser();
  if (!user || !isSuperAdminEmail(user.email))
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")
    return { ok: false, response: NextResponse.json({ error: "MFA step-up required" }, { status: 401 }) };
  return { ok: true };
}
