import { describe, it, expect } from "vitest";
import { INTAKE_SECTIONS, INTAKE_STEP_COUNT } from "../intake/schema";

describe("intake schema", () => {
  it("has 10 sections and a matching step count", () => {
    expect(INTAKE_SECTIONS.length).toBe(10);
    expect(INTAKE_STEP_COUNT).toBe(10);
  });

  it("captures sex (single question set, no gender-branching)", () => {
    const profile = INTAKE_SECTIONS.find((s) => s.id === "profile");
    expect(profile).toBeDefined();
    expect(profile!.fields.some((f) => f.id === "sex")).toBe(true);
  });

  it("has globally-unique field ids", () => {
    const ids = INTAKE_SECTIONS.flatMap((s) => s.fields.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every multi/select field has options", () => {
    for (const s of INTAKE_SECTIONS) {
      for (const f of s.fields) {
        if (f.type === "multi" || f.type === "select") {
          expect(Array.isArray(f.options) && f.options.length > 0).toBe(true);
        }
      }
    }
  });
});
