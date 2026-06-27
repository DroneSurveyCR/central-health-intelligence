import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { entitlementsForPlan, planForPrice, isPlanId } from "@/lib/billing/plans";
import { DEFAULT_ON } from "@/lib/modules/manifest";

describe("entitlementsForPlan", () => {
  const ALWAYS_AND_DEFAULT = ["core", "scheduling", "billing", "portal", "engagement"];

  it("starter includes the always-on spine + reports", () => {
    const ents = entitlementsForPlan("starter");
    for (const m of ALWAYS_AND_DEFAULT) expect(ents).toContain(m);
    expect(ents).toContain("reports");
    // starter should NOT unlock verticals
    expect(ents).not.toContain("longevity");
    expect(ents).not.toContain("labs");
  });

  it("growth adds labs, nutrition and longevity", () => {
    const ents = entitlementsForPlan("growth");
    expect(ents).toContain("labs");
    expect(ents).toContain("nutrition");
    expect(ents).toContain("longevity");
    // not everything though
    expect(ents).not.toContain("marketplace");
  });

  it("network includes all modules", () => {
    const ents = entitlementsForPlan("network");
    for (const m of [
      "labs", "nutrition", "longevity", "peptide", "hrt", "rx",
      "wearables", "marketplace", "telehealth", "multisite",
    ]) {
      expect(ents).toContain(m);
    }
  });

  it("entitlements contain no duplicates", () => {
    const ents = entitlementsForPlan("network");
    expect(new Set(ents).size).toBe(ents.length);
  });

  it("every plan always includes the full DEFAULT_ON module spine", () => {
    for (const plan of ["starter", "growth", "network", "enterprise"] as const) {
      const ents = entitlementsForPlan(plan);
      for (const m of DEFAULT_ON) expect(ents).toContain(m);
    }
  });

  it("module sets are nested: network ⊇ growth ⊇ starter", () => {
    const starter = new Set(entitlementsForPlan("starter"));
    const growth = new Set(entitlementsForPlan("growth"));
    const network = new Set(entitlementsForPlan("network"));

    for (const m of starter) expect(growth.has(m)).toBe(true);
    for (const m of growth) expect(network.has(m)).toBe(true);

    // and strictly growing (not equal sets)
    expect(growth.size).toBeGreaterThan(starter.size);
    expect(network.size).toBeGreaterThan(growth.size);
  });
});

describe("isPlanId", () => {
  it("accepts the four known plan ids", () => {
    for (const p of ["starter", "growth", "network", "enterprise"]) {
      expect(isPlanId(p)).toBe(true);
    }
  });
  it("rejects unknown / wrong-typed values", () => {
    expect(isPlanId("free")).toBe(false);
    expect(isPlanId(null)).toBe(false);
    expect(isPlanId(123)).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
  });
});

describe("planForPrice", () => {
  const ORIGINAL = process.env.STRIPE_PRICE_GROWTH;
  beforeEach(() => {
    process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_PRICE_GROWTH;
    else process.env.STRIPE_PRICE_GROWTH = ORIGINAL;
  });

  it("maps a configured price id back to its plan", () => {
    expect(planForPrice("price_growth_123")).toBe("growth");
  });

  it("returns null for an unknown or nullish price id", () => {
    expect(planForPrice("price_does_not_exist")).toBeNull();
    expect(planForPrice(null)).toBeNull();
    expect(planForPrice(undefined)).toBeNull();
    expect(planForPrice("")).toBeNull();
  });
});
