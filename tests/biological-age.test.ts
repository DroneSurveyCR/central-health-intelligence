import { describe, it, expect } from "vitest";
import { phenoAge, extractMarkerMap } from "@/lib/longevity/biological-age";

// A full, plausible SI-unit marker set (all within SI_BOUNDS).
const HEALTHY: Record<string, number> = {
  albumin: 45, // g/L
  creatinine: 80, // umol/L
  glucose: 5, // mmol/L
  crp: 1, // mg/L
  lymphocyte_pct: 30, // %
  mcv: 90, // fL
  rdw: 13, // %
  alk_phos: 70, // U/L
  wbc: 6, // 1000/uL
};

describe("phenoAge", () => {
  it("returns null when fewer than 9 markers are present", () => {
    const partial = { ...HEALTHY };
    delete partial.wbc; // 8 markers
    expect(phenoAge(partial, 50)).toBeNull();
    expect(phenoAge({}, 50)).toBeNull();
  });

  it("returns null when a value is outside SI plausible bounds (glucose 90 looks like mg/dL)", () => {
    const usUnits = { ...HEALTHY, glucose: 90 }; // mg/dL entered raw -> > 40 mmol/L bound
    expect(phenoAge(usUnits, 50)).toBeNull();
  });

  it("returns null for non-positive / non-finite chronological age", () => {
    expect(phenoAge(HEALTHY, 0)).toBeNull();
    expect(phenoAge(HEALTHY, -1)).toBeNull();
    expect(phenoAge(HEALTHY, NaN)).toBeNull();
  });

  it("returns a finite number for a full valid SI marker set", () => {
    const age = phenoAge(HEALTHY, 50);
    expect(age).not.toBeNull();
    expect(Number.isFinite(age as number)).toBe(true);
  });

  it("is monotonic-ish: a clearly worse marker set yields a higher biological age", () => {
    const healthyAge = phenoAge(HEALTHY, 50) as number;
    // Worse: higher glucose, higher CRP (inflammation), higher RDW, lower lymphocytes.
    const worse: Record<string, number> = {
      ...HEALTHY,
      glucose: 12, // still within [2,40] SI bound
      crp: 50,
      rdw: 18,
      lymphocyte_pct: 10,
    };
    const worseAge = phenoAge(worse, 50) as number;
    expect(worseAge).toBeGreaterThan(healthyAge);
  });
});

describe("extractMarkerMap", () => {
  it("maps synonyms/spellings onto canonical keys and drops unknowns", () => {
    const map = extractMarkerMap([
      { name: "Albumin", value: 45 },
      { name: "hs-CRP", value: 1 },
      { name: "Fasting Glucose", value: 5 },
      { name: "WBC", value: 6 },
      { name: "totally unknown marker", value: 123 },
    ]);
    expect(map.albumin).toBe(45);
    expect(map.crp).toBe(1);
    expect(map.glucose).toBe(5);
    expect(map.wbc).toBe(6);
    expect(Object.keys(map)).not.toContain("totally_unknown_marker");
  });

  it("skips non-finite values and keeps first occurrence", () => {
    const map = extractMarkerMap([
      { name: "albumin", value: Number.NaN },
      { name: "glucose", value: 5 },
      { name: "glucose", value: 9 },
    ]);
    expect(map.albumin).toBeUndefined();
    expect(map.glucose).toBe(5); // first occurrence wins
  });

  it("converts conventional/US units to SI when an explicit unit is given", () => {
    const map = extractMarkerMap([
      { name: "albumin", value: 4.5, unit: "g/dL" }, // x10 -> 45 g/L
      { name: "creatinine", value: 1, unit: "mg/dL" }, // x88.42 -> 88.42 umol/L
      { name: "glucose", value: 90, unit: "mg/dL" }, // /18 -> 5 mmol/L
      { name: "crp", value: 0.5, unit: "mg/dL" }, // x10 -> 5 mg/L (module SI input)
    ]);
    expect(map.albumin).toBeCloseTo(45, 5);
    expect(map.creatinine).toBeCloseTo(88.42, 2);
    expect(map.glucose).toBeCloseTo(5, 5);
    expect(map.crp).toBeCloseTo(5, 5);
  });

  it("infers conventional units from value range when no unit is supplied", () => {
    // glucose 90 with no unit is out of SI range [2,40] but in conventional
    // mg/dL range [40,600] -> convert /18 -> 5 mmol/L.
    const map = extractMarkerMap([{ name: "glucose", value: 90 }]);
    expect(map.glucose).toBeCloseTo(5, 5);
  });

  it("converts an explicit mg/dL glucose to mmol/L (÷18)", () => {
    const map = extractMarkerMap([{ name: "glucose", value: 180, unit: "mg/dL" }]);
    expect(map.glucose).toBeCloseTo(10, 5); // 180 / 18 = 10 mmol/L
  });

  it("converts an explicit g/dL albumin to g/L (×10)", () => {
    const map = extractMarkerMap([{ name: "Albumin", value: 4, unit: "g/dL" }]);
    expect(map.albumin).toBeCloseTo(40, 5); // 4 × 10 = 40 g/L
  });

  it("trusts an explicit SI unit even when the value also looks conventional", () => {
    // albumin 4.7 g/L is implausibly low for SI, but the explicit unit is trusted.
    const map = extractMarkerMap([{ name: "albumin", value: 4.7, unit: "g/L" }]);
    expect(map.albumin).toBeCloseTo(4.7, 5); // not multiplied
  });

  it("leaves already-SI values untouched", () => {
    const map = extractMarkerMap([
      { name: "glucose", value: 5, unit: "mmol/L" },
      { name: "albumin", value: 45 }, // in SI range, no unit -> unchanged
    ]);
    expect(map.glucose).toBeCloseTo(5, 5);
    expect(map.albumin).toBe(45);
  });

  it("converted conventional panel scores instead of being refused", () => {
    // A full conventional/US panel with units now CONVERTS and scores, where the
    // old refuse-only behavior would have returned null.
    const us = [
      { name: "albumin", value: 4.5, unit: "g/dL" },
      { name: "creatinine", value: 0.9, unit: "mg/dL" },
      { name: "glucose", value: 90, unit: "mg/dL" },
      { name: "crp", value: 0.1, unit: "mg/dL" },
      { name: "lymphocyte_pct", value: 30, unit: "%" },
      { name: "mcv", value: 90, unit: "fL" },
      { name: "rdw", value: 13, unit: "%" },
      { name: "alk_phos", value: 70, unit: "U/L" },
      { name: "wbc", value: 6, unit: "10^3/uL" },
    ];
    const age = phenoAge(extractMarkerMap(us), 50);
    expect(age).not.toBeNull();
    expect(Number.isFinite(age as number)).toBe(true);
  });
});
