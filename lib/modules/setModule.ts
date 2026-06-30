import type { SupabaseClient } from "@supabase/supabase-js";
import { MODULES, ALWAYS_ON } from "./manifest";
import type { ModuleId } from "./types";

export type SetModuleResult =
  | { ok: true; modules: string[] }
  | { ok: false; status: number; error: string };

/**
 * Single source of truth for "enable/disable a module on a practice", used by
 * BOTH the per-tenant staff toggle (`/api/settings/modules`, user-scoped client)
 * and the super-admin override (`/api/superadmin/modules`, service-role client).
 *
 * The caller supplies the supabase client (which determines RLS scope) and the
 * target practiceId. Validates the module, blocks always-on changes, and
 * auto-adds dependencies on enable (e.g. peptide → rx).
 */
export async function setPracticeModule(
  supabase: SupabaseClient,
  practiceId: string,
  moduleId: string,
  enabled: boolean,
): Promise<SetModuleResult> {
  if (!moduleId || !(moduleId in MODULES))
    return { ok: false, status: 400, error: "unknown module" };
  if (ALWAYS_ON.includes(moduleId as ModuleId))
    return { ok: false, status: 400, error: "cannot change core module" };

  const { data: practice, error: readErr } = await supabase
    .from("practices")
    .select("id, modules")
    .eq("id", practiceId)
    .maybeSingle();
  if (readErr || !practice)
    return { ok: false, status: 404, error: readErr?.message ?? "practice not found" };

  const current = new Set<string>((practice.modules as string[]) ?? []);
  if (enabled) {
    current.add(moduleId);
    for (const dep of MODULES[moduleId as ModuleId].dependsOn ?? []) current.add(dep);
  } else {
    current.delete(moduleId);
  }
  const next = [...current];

  const { error: updErr } = await supabase
    .from("practices")
    .update({ modules: next })
    .eq("id", practice.id as string);
  if (updErr) return { ok: false, status: 400, error: updErr.message };

  return { ok: true, modules: next };
}
