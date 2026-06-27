// Per-connector token-bucket rate limiter for outbound provider API calls.
//
// In-memory ONLY. This throttles provider.pull() calls within a single Node process
// so we stay under each provider's published rate ceilings (Dexcom/Oura are strict).
//
// ⚠️ MULTI-INSTANCE NOTE: a token bucket lives in this process's heap, so N app
// instances each get their own bucket → effective rate is N× the configured limit.
// For a horizontally-scaled deploy, swap this for a shared store (Redis INCR + EXPIRE
// or a Lua token-bucket) keyed identically by connector_slug. The acquire() contract
// below is intentionally store-agnostic so that swap is a drop-in.

type BucketConfig = {
  /** Bucket capacity (max burst). */
  capacity: number;
  /** Sustained refill rate, tokens per second. */
  refillPerSec: number;
};

// Conservative defaults. Tighter where the provider is known-strict.
const DEFAULT: BucketConfig = { capacity: 5, refillPerSec: 1 };

const LIMITS: Record<string, BucketConfig> = {
  // Dexcom: hard throttle — CGM EGV endpoints are tightly rate-limited.
  dexcom: { capacity: 2, refillPerSec: 0.2 }, // ~1 call / 5s sustained, burst 2
  // Oura: throttle hard — v2 API is generous but we keep pulls gentle.
  oura: { capacity: 3, refillPerSec: 0.5 }, // ~1 call / 2s sustained, burst 3
  withings: { capacity: 5, refillPerSec: 1 },
  garmin: { capacity: 5, refillPerSec: 1 },
  // Sandbox synthesizes data locally — effectively unlimited.
  sandbox: { capacity: 100, refillPerSec: 100 },
};

type Bucket = { tokens: number; lastRefill: number; config: BucketConfig };

const buckets = new Map<string, Bucket>();

function configFor(slug: string): BucketConfig {
  return LIMITS[slug] ?? DEFAULT;
}

function bucketFor(slug: string): Bucket {
  let b = buckets.get(slug);
  if (!b) {
    const config = configFor(slug);
    b = { tokens: config.capacity, lastRefill: Date.now(), config };
    buckets.set(slug, b);
  }
  return b;
}

function refill(b: Bucket, now: number): void {
  const elapsedSec = (now - b.lastRefill) / 1000;
  if (elapsedSec <= 0) return;
  b.tokens = Math.min(b.config.capacity, b.tokens + elapsedSec * b.config.refillPerSec);
  b.lastRefill = now;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Acquire one token for `slug`, waiting (async) until one is available.
 * Resolves once a token has been consumed. Safe to await before each provider.pull().
 */
export async function acquire(slug: string): Promise<void> {
  // Loop: top up, try to take a token, otherwise sleep until the next token is due.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const b = bucketFor(slug);
    refill(b, Date.now());
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return;
    }
    const deficit = 1 - b.tokens;
    const waitMs = Math.max(10, Math.ceil((deficit / b.config.refillPerSec) * 1000));
    await sleep(waitMs);
  }
}

/**
 * Non-blocking check: consume a token if available and return true, else false.
 * Useful for callers that prefer to defer rather than wait.
 */
export function tryAcquire(slug: string): boolean {
  const b = bucketFor(slug);
  refill(b, Date.now());
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}
