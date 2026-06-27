import crypto from "crypto";

// Signed OAuth `state` so the callback can trust which (practice, patient, provider)
// a consent belongs to without a server-side session round-trip. HMAC-SHA256 with
// a server secret; tamper-evident and time-bounded.

const SECRET =
  process.env.CONNECTOR_STATE_SECRET || process.env.CRON_SECRET || "dev-insecure-secret";
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes to complete the consent flow

export type StatePayload = {
  practice_id: string;
  patient_id: string;
  slug: string;
  ts: number;
};

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signState(p: Omit<StatePayload, "ts">): string {
  const payload: StatePayload = { ...p, ts: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state: string): StatePayload | null {
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  // constant-time compare
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return null;
  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as StatePayload;
    if (!payload.practice_id || !payload.patient_id || !payload.slug) return null;
    if (Date.now() - payload.ts > MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
