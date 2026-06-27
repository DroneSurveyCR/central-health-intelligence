import { describe, it, expect } from "vitest";
import { isCrisis } from "@/lib/assistant/safety";

describe("isCrisis", () => {
  it("flags explicit self-harm / suicide language", () => {
    expect(isCrisis("I want to kill myself")).toBe(true);
    expect(isCrisis("I've been thinking about suicide")).toBe(true);
    expect(isCrisis("I want to die")).toBe(true);
  });

  it("flags cardiac / respiratory red flags", () => {
    expect(isCrisis("I have chest pain right now")).toBe(true);
    expect(isCrisis("I can't breathe")).toBe(true);
  });

  it("does NOT flag a benign data question", () => {
    expect(isCrisis("what is HRV")).toBe(false);
    expect(isCrisis("Can you explain my latest glucose reading?")).toBe(false);
    expect(isCrisis("")).toBe(false);
  });
});
