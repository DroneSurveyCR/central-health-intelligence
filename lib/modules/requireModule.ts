// HealthSync Cloud — server-side module gate.
// Mirrors the existing `requireStaff()` pattern in lib/auth/roles.ts: an async
// guard called at the top of a module-scoped route segment / API route. If the
// caller's practice doesn't have the module, redirect to the upgrade page.
//
// This is Layer B of the gating model (plan §1.4) — the REAL gate. RLS is
// defense-in-depth; UI hiding is cosmetic.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveModules, isModuleEnabled } from "./index";
import type { ModuleId } from "./types";

/**
 * Load the effective module set for the currently authenticated user's practice.
 * Resolves practice via the practitioner row first, then the patient row
 * (mirrors the SQL `current_practice_id()` helper).
 */
export async function getEnabledModules(): Promise<Set<ModuleId>> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return resolveModules([]);

  // practitioner first
  const { data: prac } = await supabase
    .from("practitioners")
    .select("practice_id")
    .eq("auth_user_id", uid)
    .eq("active", true)
    .maybeSingle();

  let practiceId = prac?.practice_id as string | undefined;

  if (!practiceId) {
    const { data: pt } = await supabase
      .from("patients")
      .select("practice_id")
      .eq("auth_user_id", uid)
      .is("deleted_at", null)
      .maybeSingle();
    practiceId = pt?.practice_id as string | undefined;
  }
  if (!practiceId) return resolveModules([]);

  const { data: practice } = await supabase
    .from("practices")
    .select("modules")
    .eq("id", practiceId)
    .maybeSingle();

  return resolveModules((practice?.modules as string[]) ?? []);
}

/** Boolean check without redirecting. */
export async function hasModule(moduleId: ModuleId): Promise<boolean> {
  return (await getEnabledModules()).has(moduleId);
}

/**
 * Hard guard for a server component / route. Redirects to /upgrade if the
 * practice lacks the module. Call at the top of a module-scoped layout.tsx.
 */
export async function requireModule(moduleId: ModuleId): Promise<void> {
  if (!(await hasModule(moduleId))) {
    redirect(`/upgrade?module=${moduleId}`);
  }
}

/** Convenience for API routes: returns true/false from a known modules array. */
export function apiRequireModule(
  declared: readonly string[] | null | undefined,
  moduleId: ModuleId,
): boolean {
  return isModuleEnabled(declared, moduleId);
}
