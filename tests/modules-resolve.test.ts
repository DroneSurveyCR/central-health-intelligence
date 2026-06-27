import { describe, it, expect } from "vitest";
import { resolveModules, isModuleEnabled } from "@/lib/modules/index";

describe("resolveModules", () => {
  it("always includes always-on modules (core) even for an empty/nullish declaration", () => {
    expect(resolveModules([]).has("core")).toBe(true);
    expect(resolveModules(null).has("core")).toBe(true);
    expect(resolveModules(undefined).has("core")).toBe(true);
  });

  it("expands longevity's hard dep on labs", () => {
    const set = resolveModules(["longevity"]);
    expect(set.has("longevity")).toBe(true);
    expect(set.has("labs")).toBe(true);
  });

  it("expands peptide's hard dep on rx", () => {
    const set = resolveModules(["peptide"]);
    expect(set.has("peptide")).toBe(true);
    expect(set.has("rx")).toBe(true);
  });

  it("expands transitive deps (hrt -> labs + rx)", () => {
    const set = resolveModules(["hrt"]);
    expect(set.has("hrt")).toBe(true);
    expect(set.has("labs")).toBe(true);
    expect(set.has("rx")).toBe(true);
  });

  it("ignores unknown module ids defensively", () => {
    const set = resolveModules(["not_a_real_module", "labs"]);
    expect(set.has("labs")).toBe(true);
    expect(set.has("not_a_real_module" as never)).toBe(false);
  });
});

describe("isModuleEnabled", () => {
  it("is true for a dependency pulled in transitively", () => {
    expect(isModuleEnabled(["longevity"], "labs")).toBe(true);
  });
  it("is true for always-on core regardless of declaration", () => {
    expect(isModuleEnabled([], "core")).toBe(true);
  });
  it("is false for a module not declared and not a dependency", () => {
    expect(isModuleEnabled(["labs"], "peptide")).toBe(false);
  });
});
