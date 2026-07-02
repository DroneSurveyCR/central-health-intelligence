import { describe, it, expect } from "vitest";
import { classifyScope, IN_SCOPE_TERMS, OUT_SCOPE_TERMS } from "@/lib/chiro/knowledge";

describe("chiro assistant scope guard", () => {
  it("classifies clearly in-scope questions as 'in'", () => {
    const inScope = [
      "What are normal cervical lordosis values?",
      "How is scoliosis graded by Cobb angle?",
      "Explain a C6 subluxation and its dermatome",
      "What does motion palpation of the lumbar spine assess?",
      "Can chiropractic adjustments help with sciatica?",
      "How does a Tytron thermal scan work?",
    ];
    for (const q of inScope) expect(classifyScope(q)).toBe("in");
  });

  it("fast-refuses clearly out-of-scope questions as 'out'", () => {
    const outScope = [
      "What medication should I take for depression?",
      "How do I treat my diabetes with insulin?",
      "What's the best stock to invest in?",
      "Give me a recipe for dinner",
      "Which vaccine is best for covid?",
    ];
    for (const q of outScope) expect(classifyScope(q)).toBe("out");
  });

  it("returns 'unknown' for ambiguous questions (model backstop decides)", () => {
    expect(classifyScope("Hello, can you help me?")).toBe("unknown");
    expect(classifyScope("What can you do?")).toBe("unknown");
    expect(classifyScope("")).toBe("unknown");
  });

  it("prefers in-scope when a question mixes signals (MSK context wins)", () => {
    // contains an out term ("thyroid") but also an in term ("neck pain")
    expect(classifyScope("Is my neck pain related to my thyroid?")).toBe("in");
  });

  it("has non-empty, lowercase term lists", () => {
    expect(IN_SCOPE_TERMS.length).toBeGreaterThan(20);
    expect(OUT_SCOPE_TERMS.length).toBeGreaterThan(10);
    for (const t of [...IN_SCOPE_TERMS, ...OUT_SCOPE_TERMS]) expect(t).toBe(t.toLowerCase());
  });
});
