import { describe, it, expect } from "vitest";
import { normalizeSex } from "../intake/normalize";

describe("normalizeSex", () => {
  it("maps to the DB enum", () => {
    expect(normalizeSex("Male")).toBe("male");
    expect(normalizeSex("female")).toBe("female");
    expect(normalizeSex("Prefer not to say")).toBe("other");
    expect(normalizeSex("Other")).toBe("other");
    expect(normalizeSex("")).toBe("other");
    expect(normalizeSex(null)).toBe("other");
    expect(normalizeSex(undefined)).toBe("other");
  });
});
