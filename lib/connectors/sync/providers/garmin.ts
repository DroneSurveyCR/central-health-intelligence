import { createHmac, timingSafeEqual } from "node:crypto";
import type { SyncProvider, TokenSet, DailySummary } from "../types";

// Garmin (Health API). Pulls daily summaries (RHR / HRV / steps / sleep) into the
// normalized DailySummary. Activates once GARMIN_CLIENT_ID + GARMIN_CLIENT_SECRET
// are set; until then isConfigured() is false and the authorize route 503s.
//
// ⚠️ SCAFFOLD — OAuth1.0a, not OAuth2:
// TODO(garmin-oauth): Garmin's Health/Wellness API uses OAuth1.0a (HMAC-SHA1 request
//   signing with consumer key/secret + per-request nonce/timestamp + a 3-legged
//   request-token/access-token dance), NOT the OAuth2 code-exchange modeled below.
//   Newer Garmin Connect "Wellness OAuth2 + PKCE" exists for select partners — if
//   approved for that, this OAuth2 shape becomes correct once code_verifier/code_challenge
//   (PKCE) are added to authorizeUrl/exchangeCode. Until one of those is wired, the
//   OAuth2 methods here are placeholders so the provider registers and stays inert
//   (isConfigured()-gated). Do not ship real Garmin auth on this shape unverified.

const AUTH = "https://connect.garmin.com/oauth2Confirm";
const TOKEN = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
const API = "https://apis.garmin.com/wellness-api/rest";
const SCOPES = ["wellness"];

function clientId() {
  return process.env.GARMIN_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.GARMIN_CLIENT_SECRET || "";
}

// OAuth2 token shape (SCAFFOLD — see TODO above). Real Garmin OAuth1.0a needs
// request signing instead of this client_id/secret body exchange.
async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }),
  });
  if (!res.ok) throw new Error(`garmin token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? null,
    expires_at: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null,
  };
}

function dateOf(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export const garminProvider: SyncProvider = {
  slug: "garmin",
  label: "Garmin",
  module: "wearables",
  cadenceMinutes: 60 * 12,
  requiresOAuth: true,
  isConfigured: () => Boolean(clientId() && clientSecret()),
  // SCAFFOLD: OAuth2 authorize shape. TODO(garmin-oauth): swap for OAuth1.0a 3-legged
  // request-token flow OR add PKCE (code_challenge) if granted Garmin's OAuth2 program.
  authorizeUrl(state, redirectUri) {
    return `${AUTH}?${new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
    })}`;
  },
  exchangeCode(code, redirectUri) {
    return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },
  refresh(refreshToken) {
    return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  },
  async pull(token, since) {
    // Garmin dailies endpoint takes an upload-time window (unix seconds, ≤ 24h spans in
    // production; we request the whole range and let the API clamp). Each summary carries
    // calendarDate + restingHeartRate + steps + sleep + (optionally) HRV.
    const startTs = Math.floor(since.getTime() / 1000);
    const endTs = Math.floor(Date.now() / 1000);
    const url = `${API}/dailies?${new URLSearchParams({
      uploadStartTimeInSeconds: String(startTs),
      uploadEndTimeInSeconds: String(endTs),
    })}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!res.ok) throw new Error(`garmin dailies ${res.status}`);
    const records = (await res.json()) as Array<{
      calendarDate?: string;
      startTimeInSeconds?: number;
      restingHeartRate?: number;
      averageHeartRateInBeatsPerMinute?: number;
      hrvAverage?: number;
      steps?: number;
      durationInSeconds?: number; // sleep duration when this is a sleep summary
      sleepTimeInSeconds?: number;
    }>;

    const byDate = new Map<string, DailySummary>();
    for (const rec of records ?? []) {
      const date = rec.calendarDate || (rec.startTimeInSeconds ? dateOf(rec.startTimeInSeconds) : null);
      if (!date) continue;
      const day = byDate.get(date) ?? { date };
      if (rec.restingHeartRate != null) day.resting_hr = rec.restingHeartRate;
      if (rec.hrvAverage != null) day.hrv_ms = rec.hrvAverage;
      if (rec.steps != null) day.steps = rec.steps;
      const sleepSecs = rec.sleepTimeInSeconds ?? rec.durationInSeconds;
      if (sleepSecs != null) day.sleep_hours = Math.round((sleepSecs / 3600) * 10) / 10;
      day.raw = { source: "garmin", date };
      byDate.set(date, day);
    }
    return [...byDate.values()];
  },
  // Garmin Health API "Ping/Push" webhooks can be HMAC-verified with the consumer secret.
  // TODO(garmin-oauth): confirm the exact signing recipe once the OAuth flow is finalized
  // (header name + whether it signs the raw body or a canonical string). We verify the
  // standard HMAC-SHA256-of-raw-body shape against X-Garmin-Signature (hex or base64).
  webhookVerify(req, rawBody) {
    const secret = clientSecret();
    if (!secret) return false;
    const sig = req.headers.get("x-garmin-signature") || req.headers.get("x-signature") || "";
    if (!sig) return false;
    const mac = createHmac("sha256", secret).update(rawBody, "utf8").digest();
    const candidates = [mac.toString("hex"), mac.toString("base64")];
    return candidates.some((expected) => {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  },
};
