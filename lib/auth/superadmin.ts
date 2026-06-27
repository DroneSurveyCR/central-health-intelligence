import { redirect } from "next/navigation";
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
  const { user } = await getSessionUser();
  if (!user || !isSuperAdminEmail(user.email)) redirect("/login");
  return user;
}
