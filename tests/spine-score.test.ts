import { describe, it, expect } from "vitest";
import { scoreSpine, scoreBand } from "@/lib/spine/score";
import { blankVertebra, blankSpineConditions, VERTEBRAE } from "@/lib/spine/schema";

const perfectVertebrae = () => VERTEBRAE.map((v) => blankVertebra(v.id));

describe("spine alignment score", () => {
  it("scores a perfect spine at 100 (excellent) with no deductions", () => {
    const r = scoreSpine(perfectVertebrae(), blankSpineConditions(), []);
    expect(r.score).toBe(100);
    expect(r.band).toBe("excellent");
    expect(r.deductions).toEqual([]);
  });

  it("itemises deductions and lands in a sensible range", () => {
    const v = perfectVertebrae();
    v[0].s2.severity = "high"; // -5
    v[0].s2.motion = "fixated"; // -2
    v[5].s2.severity = "moderate"; // -3
    const c = blankSpineConditions();
    c.scoliosis.cobbDeg = 30; // moderate -10
    c.flags = ["stenosis"]; // -4
    const r = scoreSpine(v, c, [{ severity: "moderate" }]); // posture -2
    expect(r.score).toBe(100 - 5 - 2 - 3 - 10 - 4 - 2);
    expect(r.band).toBe("fair");
    expect(r.deductions.length).toBeGreaterThan(3);
  });

  it("floors at 0 for a very poor spine (never negative)", () => {
    const v = perfectVertebrae().map((x) => ({
      ...x,
      s2: { ...x.s2, severity: "high" as const, motion: "fixated" as const },
    }));
    const c = blankSpineConditions();
    c.scoliosis.cobbDeg = 50;
    c.flags = ["stenosis", "spondylosis", "ddd"];
    const r = scoreSpine(v, c, []);
    expect(r.score).toBe(0);
    expect(r.band).toBe("poor");
  });

  it("maps bands to the right thresholds", () => {
    expect(scoreBand(95)).toBe("excellent");
    expect(scoreBand(80)).toBe("good");
    expect(scoreBand(65)).toBe("fair");
    expect(scoreBand(45)).toBe("guarded");
    expect(scoreBand(20)).toBe("poor");
  });

  it("reads only the requested scan point (baseline vs current)", () => {
    const v = perfectVertebrae();
    v[0].s1.severity = "high"; // baseline bad, current perfect
    expect(scoreSpine(v, blankSpineConditions(), [], "s2").score).toBe(100);
    expect(scoreSpine(v, blankSpineConditions(), [], "s1").score).toBe(95);
  });
});
