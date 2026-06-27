import { describe, it, expect } from "vitest";
import { isDoseSafe, maxDoseFor } from "@/lib/hrt/templates";

describe("hrt maxDoseFor", () => {
  it("returns the per-hormone ceiling (case-insensitive)", () => {
    expect(maxDoseFor("testosterone_cypionate")).toBe(200);
    expect(maxDoseFor("Estradiol")).toBe(10);
    expect(maxDoseFor(" THYROID ")).toBe(200);
  });

  it("falls back to the generic 100 cap for unknown / nullish hormones", () => {
    expect(maxDoseFor("mystery_hormone")).toBe(100);
    expect(maxDoseFor(null)).toBe(100);
    expect(maxDoseFor(undefined)).toBe(100);
  });
});

describe("hrt isDoseSafe", () => {
  it("rejects zero, negatives and NaN", () => {
    expect(isDoseSafe(0, "estradiol")).toBe(false);
    expect(isDoseSafe(-5, "estradiol")).toBe(false);
    expect(isDoseSafe(NaN, "estradiol")).toBe(false);
  });

  it("rejects over-ceiling doses (estradiol 24mg)", () => {
    expect(isDoseSafe(24, "estradiol")).toBe(false);
    expect(isDoseSafe(201, "testosterone_cypionate")).toBe(false);
  });

  it("accepts an in-range dose", () => {
    expect(isDoseSafe(2, "estradiol")).toBe(true);
    expect(isDoseSafe(200, "testosterone_cypionate")).toBe(true); // at ceiling
  });

  it("uses the generic cap for an unknown hormone", () => {
    expect(isDoseSafe(50, "mystery_hormone")).toBe(true);
    expect(isDoseSafe(150, "mystery_hormone")).toBe(false);
  });
});
