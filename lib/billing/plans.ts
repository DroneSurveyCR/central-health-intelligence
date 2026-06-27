// SaaS plan catalogue + plan→module entitlement mapping.
// A plan grants a DECLARED set of modules (stored in practices.modules); the module
// resolver expands hard-dependencies at read time (longevity→labs, peptide→rx, …).
// The Stripe Price IDs are read from env so the same code works in test + live once
// the products are created; until then billing UI shows plans and checkout 503s.

import type { ModuleId } from "@/lib/modules/types";
import { MODULES, DEFAULT_ON } from "@/lib/modules/manifest";

export type PlanId = "starter" | "growth" | "network" | "enterprise";

const ALL_MODULES = Object.keys(MODULES) as ModuleId[];

export type PlanDef = {
  id: PlanId;
  label: string;
  priceMonthly: number; // USD (display)
  priceEnvVar: string; // env var holding the Stripe recurring Price ID
  blurb: string;
  /** Modules beyond the always-on platform spine this plan unlocks. */
  extras: ModuleId[];
};

export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    id: "starter",
    label: "Solo",
    priceMonthly: 149,
    priceEnvVar: "STRIPE_PRICE_STARTER",
    blurb: "Single provider. The full platform: records, scheduling, billing, portal, reports.",
    extras: ["reports"],
  },
  growth: {
    id: "growth",
    label: "Clinic",
    priceMonthly: 349,
    priceEnvVar: "STRIPE_PRICE_GROWTH",
    blurb: "Multi-provider. Adds labs, nutrition, and the longevity vertical.",
    extras: ["reports", "labs", "nutrition", "longevity"],
  },
  network: {
    id: "network",
    label: "Network",
    priceMonthly: 599,
    priceEnvVar: "STRIPE_PRICE_NETWORK",
    blurb: "Everything: all vertical modules, premium connectors, and the modality marketplace.",
    extras: ALL_MODULES,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    priceMonthly: 0,
    priceEnvVar: "STRIPE_PRICE_ENTERPRISE",
    blurb: "White-label, custom connectors, data residency, SLA. Contact sales.",
    extras: ALL_MODULES,
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "growth", "network", "enterprise"];

/** The DECLARED practices.modules array a plan grants (deps auto-expand at read). */
export function entitlementsForPlan(plan: PlanId): ModuleId[] {
  const set = new Set<ModuleId>([...(DEFAULT_ON as ModuleId[]), ...PLANS[plan].extras]);
  return [...set];
}

export function isPlanId(v: unknown): v is PlanId {
  return v === "starter" || v === "growth" || v === "network" || v === "enterprise";
}

/** Map a Stripe Price ID back to a plan (webhook side). */
export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const p of Object.values(PLANS)) {
    if (process.env[p.priceEnvVar] && process.env[p.priceEnvVar] === priceId) return p.id;
  }
  return null;
}
