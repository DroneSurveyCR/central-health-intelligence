import { describe, it, expect } from "vitest";
import { signState, verifyState } from "@/lib/connectors/sync/state";

const PAYLOAD = {
  practice_id: "prac_123",
  patient_id: "pat_456",
  slug: "oura",
};

describe("signState / verifyState", () => {
  it("round-trips a valid signed state back to its payload", () => {
    const token = signState(PAYLOAD);
    const out = verifyState(token);
    expect(out).not.toBeNull();
    expect(out?.practice_id).toBe("prac_123");
    expect(out?.patient_id).toBe("pat_456");
    expect(out?.slug).toBe("oura");
    expect(typeof out?.ts).toBe("number");
  });

  it("returns null when the signature is tampered with", () => {
    const token = signState(PAYLOAD);
    const [body, sig] = token.split(".");
    // Flip a character in the signature (keep length so we exercise the HMAC check).
    const tamperedSig = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifyState(`${body}.${tamperedSig}`)).toBeNull();
  });

  it("returns null when the body is tampered with (signature no longer matches)", () => {
    const token = signState(PAYLOAD);
    const [, sig] = token.split(".");
    expect(verifyState(`tampered_body.${sig}`)).toBeNull();
  });

  it("returns null for garbage / short / empty strings", () => {
    expect(verifyState("")).toBeNull();
    expect(verifyState("garbage")).toBeNull();
    expect(verifyState("a.b")).toBeNull();
    expect(verifyState(".")).toBeNull();
    // @ts-expect-error testing nullish input defensively
    expect(verifyState(null)).toBeNull();
  });
});
