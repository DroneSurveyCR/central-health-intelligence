import { describe, it, expect } from "vitest";
import {
  VERTEBRAE,
  VERTEBRA_IDS,
  classifyScoliosis,
  classifyCurve,
  dermatomeFor,
  blankVertebra,
  blankSpineConditions,
  CURVE_NORMS,
} from "@/lib/spine/schema";

describe("spine schema", () => {
  it("has the full vertebral column (C1-C7, T1-T12, L1-L5, S1 = 25 segments)", () => {
    expect(VERTEBRAE.length).toBe(25);
    expect(VERTEBRA_IDS).toContain("c1");
    expect(VERTEBRA_IDS).toContain("t12");
    expect(VERTEBRA_IDS).toContain("l5");
    expect(VERTEBRA_IDS).toContain("s1");
    // ids are unique + lowercase
    expect(new Set(VERTEBRA_IDS).size).toBe(VERTEBRA_IDS.length);
    for (const id of VERTEBRA_IDS) expect(id).toBe(id.toLowerCase());
  });

  it("grades scoliosis by Cobb angle thresholds", () => {
    expect(classifyScoliosis(0)).toBe("none");
    expect(classifyScoliosis(9)).toBe("none");
    expect(classifyScoliosis(10)).toBe("mild");
    expect(classifyScoliosis(25)).toBe("mild");
    expect(classifyScoliosis(26)).toBe("moderate");
    expect(classifyScoliosis(40)).toBe("moderate");
    expect(classifyScoliosis(41)).toBe("severe");
  });

  it("classifies sagittal curves against their norms", () => {
    const c = CURVE_NORMS.cervical_lordosis; // 20-40
    expect(classifyCurve("cervical_lordosis", c.min - 1)).toBe("hypo");
    expect(classifyCurve("cervical_lordosis", (c.min + c.max) / 2)).toBe("normal");
    expect(classifyCurve("cervical_lordosis", c.max + 1)).toBe("hyper");
  });

  it("maps every vertebra to a dermatome reference", () => {
    for (const id of VERTEBRA_IDS) expect(dermatomeFor(id).length).toBeGreaterThan(0);
    expect(dermatomeFor("nope")).toBe("");
  });

  it("produces blank findings with safe defaults", () => {
    const v = blankVertebra("c3");
    expect(v.region_code).toBe("c3");
    expect(v.s1.severity).toBe("normal");
    expect(v.s2.listing).toEqual([]);
    const cond = blankSpineConditions();
    expect(cond.scoliosis.cobbDeg).toBe(0);
    expect(cond.flags).toEqual([]);
  });
});
