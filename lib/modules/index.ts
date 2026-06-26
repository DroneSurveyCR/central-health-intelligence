// HealthSync Cloud — module resolution.
// Expands a practice's declared modules to include transitive hard-dependencies,
// always-on modules, and answers "is X enabled?".

import { MODULES, ALWAYS_ON } from "./manifest";
import type { ModuleId } from "./types";

/**
 * Given the raw `practices.modules` array, return the full effective set:
 * declared modules + their transitive `dependsOn` + always-on modules.
 * Buying `longevity` therefore silently activates `labs`; buying `peptide`
 * activates `rx`.
 */
export function resolveModules(declared: readonly string[] | null | undefined): Set<ModuleId> {
  const enabled = new Set<ModuleId>(ALWAYS_ON);
  const visit = (id: ModuleId) => {
    if (enabled.has(id)) return;
    if (!MODULES[id]) return; // unknown id in the column -> ignore defensively
    enabled.add(id);
    for (const dep of MODULES[id].dependsOn ?? []) visit(dep);
  };
  for (const raw of declared ?? []) {
    if (raw in MODULES) visit(raw as ModuleId);
  }
  return enabled;
}

/** True if `moduleId` is effectively enabled given the practice's declared modules. */
export function isModuleEnabled(
  declared: readonly string[] | null | undefined,
  moduleId: ModuleId,
): boolean {
  return resolveModules(declared).has(moduleId);
}

/**
 * Which module owns a given connector slug (bundled or add-on). Used by the
 * import API to gate connector writes — connectors bypass RLS via the admin
 * client, so this route-layer check is load-bearing.
 */
export function moduleForConnector(slug: string): ModuleId | null {
  for (const m of Object.values(MODULES)) {
    if (m.includedConnectors?.includes(slug) || m.addonConnectors?.includes(slug)) {
      return m.id;
    }
  }
  return null;
}
