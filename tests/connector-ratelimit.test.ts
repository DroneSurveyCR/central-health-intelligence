import { describe, it, expect } from "vitest";
import { tryAcquire, acquire } from "@/lib/connectors/sync/ratelimit";

// The bucket map is a module-level singleton keyed by slug, so each test uses a
// distinct/known slug to stay isolated. We rely on the configured per-provider
// limits (dexcom capacity 2, sandbox capacity 100) — no sleeping required.

describe("tryAcquire (token bucket)", () => {
  it("returns true up to capacity then false within a burst (dexcom, capacity 2)", () => {
    // Fresh bucket for 'dexcom' starts full at capacity 2.
    expect(tryAcquire("dexcom")).toBe(true); // 2 -> 1
    expect(tryAcquire("dexcom")).toBe(true); // 1 -> 0
    // Bucket exhausted; refill is ~0.2/s so within an immediate burst no token is due.
    expect(tryAcquire("dexcom")).toBe(false);
    expect(tryAcquire("dexcom")).toBe(false);
  });

  it("an unknown slug uses DEFAULT capacity 5 and eventually throttles", () => {
    const slug = "unknown-provider-x";
    let granted = 0;
    // Burst far beyond DEFAULT capacity (5); the first 5 succeed, the rest fail.
    for (let i = 0; i < 20; i++) {
      if (tryAcquire(slug)) granted++;
    }
    expect(granted).toBe(5);
    expect(tryAcquire(slug)).toBe(false);
  });

  it("sandbox is effectively unlimited for a normal burst (capacity 100)", () => {
    let granted = 0;
    for (let i = 0; i < 50; i++) {
      if (tryAcquire("sandbox")) granted++;
    }
    expect(granted).toBe(50);
  });
});

describe("acquire (async)", () => {
  it("resolves immediately when a token is available", async () => {
    // Fresh slug → full bucket → resolves without waiting.
    await expect(acquire("acquire-fresh-slug")).resolves.toBeUndefined();
  });

  it("resolves after waiting when the bucket is briefly empty", async () => {
    // Drain a high-refill provider so the wait is short and deterministic.
    // Use 'garmin' (capacity 5, refill 1/s) but only assert acquire eventually resolves.
    const slug = "garmin";
    while (tryAcquire(slug)) {
      // drain to empty
    }
    // Now empty; acquire must wait for a refill, then resolve. refill is 1/s so the
    // bucket's computed wait is ~1s — keep the test bounded but allow it.
    await expect(acquire(slug)).resolves.toBeUndefined();
  }, 4000);
});
