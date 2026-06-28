import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// At-rest encryption for connector OAuth tokens (AES-256-GCM).
// The DB stores ONLY ciphertext in the `v1:<iv_b64>:<tag_b64>:<ct_b64>` envelope.
// Backward-compatible: legacy plaintext (anything not prefixed `v1:`) decrypts to itself.
// If CONNECTOR_ENC_KEY is unset we fall back to identity (no crypto) so dev/sandbox works.

const PREFIX = "v1:";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // standard GCM nonce length
const TAG_BYTES = 16;

let warnedMissingKey = false;

/** Resolve a 32-byte AES key from CONNECTOR_ENC_KEY, or null if unset/empty. */
function getKey(): Buffer | null {
  const raw = process.env.CONNECTOR_ENC_KEY;
  if (!raw || raw.trim() === "") return null;
  const secret = raw.trim();

  // Accept an exact 32-byte key supplied as hex or base64; otherwise derive one.
  // hex (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  // base64 / base64url decoding exactly to 32 bytes
  try {
    const b64 = Buffer.from(secret, "base64");
    if (b64.length === 32) return b64;
  } catch {
    // fall through to derivation
  }
  // Any other sufficiently-long secret: derive deterministically via scrypt.
  // Fixed salt keeps decryption stable across processes (the secret is the real entropy).
  return scryptSync(secret, "connector-token-enc:v1", 32);
}

function warnOnce(): void {
  if (!warnedMissingKey) {
    warnedMissingKey = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[connectors/crypto] CONNECTOR_ENC_KEY is not set — OAuth tokens are stored in PLAINTEXT (identity fallback). Set it in production.",
    );
  }
}

/** True in a deployed production environment (Vercel prod or NODE_ENV=production). */
function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Encrypt a plaintext token into the `v1:` envelope.
 * Identity fallback ONLY in non-production (dev/sandbox). In production a missing key is a hard
 * error — silently storing real OAuth tokens in cleartext at rest is never acceptable.
 */
export function encryptToken(plain: string): string {
  const key = getKey();
  if (!key) {
    if (isProduction())
      throw new Error(
        "[connectors/crypto] CONNECTOR_ENC_KEY is required in production — refusing to store OAuth tokens in plaintext.",
      );
    warnOnce();
    return plain;
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Decrypt a stored token. Backward-compatible:
 * - input not starting with `v1:` (legacy plaintext) is returned unchanged.
 * - if CONNECTOR_ENC_KEY is unset, a `v1:` value cannot be decrypted, so we throw.
 */
export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    // Legacy plaintext (e.g. "sandbox-access") — pass through untouched.
    return stored;
  }
  const key = getKey();
  if (!key) {
    warnOnce();
    throw new Error("[connectors/crypto] CONNECTOR_ENC_KEY unset but an encrypted (v1:) token was found.");
  }
  const parts = stored.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("[connectors/crypto] malformed encrypted token envelope.");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  if (tag.length !== TAG_BYTES) {
    throw new Error("[connectors/crypto] invalid auth tag length.");
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}
