import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// A fixed 32-byte key (base64) so encryption is deterministic-key (IV still random).
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

beforeAll(() => {
  vi.stubEnv("CONNECTOR_ENC_KEY", TEST_KEY);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// Import AFTER the env is stubbed. getKey() reads process.env at call time, not at
// import time, so a dynamic import keeps things robust regardless of ordering.
async function load() {
  return import("@/lib/connectors/sync/crypto");
}

describe("encryptToken / decryptToken round-trip", () => {
  it("round-trips a variety of plaintexts (ascii, unicode, empty)", async () => {
    const { encryptToken, decryptToken } = await load();
    const samples = [
      "sandbox-access",
      "ya29.A0ARrdaM-longish-oauth-access-token_value-1234567890",
      "with spaces and symbols !@#$%^&*()",
      "unicode: café ☕ 日本語 🩺",
      "", // empty string
    ];
    for (const plain of samples) {
      const enc = encryptToken(plain);
      expect(enc.startsWith("v1:")).toBe(true);
      expect(enc).not.toBe(plain); // ciphertext envelope, not plaintext
      expect(decryptToken(enc)).toBe(plain);
    }
  });

  it("legacy plaintext (no v1: prefix) decrypts to itself unchanged", async () => {
    const { decryptToken } = await load();
    expect(decryptToken("sandbox-access")).toBe("sandbox-access");
    expect(decryptToken("")).toBe(""); // empty is not v1: → passthrough
    expect(decryptToken("not-an-envelope:still-fine")).toBe("not-an-envelope:still-fine");
  });

  it("two encryptions of the same plaintext differ (random IV) but both decrypt", async () => {
    const { encryptToken, decryptToken } = await load();
    const plain = "same-token-value";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(a).not.toBe(b); // random IV → different envelopes
    expect(decryptToken(a)).toBe(plain);
    expect(decryptToken(b)).toBe(plain);
  });

  it("throws on a malformed v1: envelope", async () => {
    const { decryptToken } = await load();
    expect(() => decryptToken("v1:onlyonepart")).toThrow();
  });
});
