import { describe, it, expect } from "vitest";
import { isDoseSafe, maxDoseFor } from "@/lib/peptide/templates";

describe("peptide maxDoseFor", () => {
  it("returns the FDA ceiling for known GLP-1 compounds (case-insensitive)", () => {
    expect(maxDoseFor("semaglutide")).toBe(2.4);
    expect(maxDoseFor("Semaglutide")).toBe(2.4);
    expect(maxDoseFor("  TIRZEPATIDE ")).toBe(15);
  });

  it("falls back to the generic 100mg cap for unknown / nullish compounds", () => {
    expect(maxDoseFor("unobtanium")).toBe(100);
    expect(maxDoseFor(null)).toBe(100);
    expect(maxDoseFor(undefined)).toBe(100);
    expect(maxDoseFor("")).toBe(100);
  });
});

describe("peptide isDoseSafe", () => {
  it("rejects zero, negatives and NaN", () => {
    expect(isDoseSafe(0, "semaglutide")).toBe(false);
    expect(isDoseSafe(-1, "semaglutide")).toBe(false);
    expect(isDoseSafe(NaN, "semaglutide")).toBe(false);
    expect(isDoseSafe(Infinity, "semaglutide")).toBe(false);
  });

  it("rejects over-ceiling doses (semaglutide 24mg)", () => {
    expect(isDoseSafe(24, "semaglutide")).toBe(false);
    expect(isDoseSafe(2.5, "semaglutide")).toBe(false);
  });

  it("accepts an in-range dose (semaglutide 2.4mg, at ceiling)", () => {
    expect(isDoseSafe(2.4, "semaglutide")).toBe(true);
    expect(isDoseSafe(1.0, "semaglutide")).toBe(true);
  });

  it("uses the generic cap for an unknown compound", () => {
    expect(isDoseSafe(50, "unobtanium")).toBe(true); // <= 100 generic cap
    expect(isDoseSafe(150, "unobtanium")).toBe(false); // over generic cap
  });
});
