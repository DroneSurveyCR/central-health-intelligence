import type { SyncProvider, TokenSet, DailySummary } from "../types";

// Dexcom (OAuth2 + Dexcom EGV API v3). Pulls Estimated Glucose Values (EGV) and
// reduces them per day into avg_glucose_mgdl + time_in_range_pct (70–180 mg/dL).
// Activates once DEXCOM_CLIENT_ID + DEXCOM_CLIENT_SECRET are set; until then
// isConfigured() is false and the authorize route returns a "not configured" 503.
//
// NOTE: Dexcom runs a separate sandbox host (sandbox-api.dexcom.com). We target
// the production host; flip the base via DEXCOM_API_BASE if pointing at sandbox.

const BASE = process.env.DEXCOM_API_BASE || "https://api.dexcom.com";
const AUTH = `${BASE}/v2/oauth2/login`;
const TOKEN = `${BASE}/v2/oauth2/token`;
const EGV = `${BASE}/v3/users/self/egvs`;
const SCOPES = ["offline_access"];

// Standard CGM time-in-range target band (mg/dL).
const TIR_LOW = 70;
const TIR_HIGH = 180;

function clientId() {
  return process.env.DEXCOM_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.DEXCOM_CLIENT_SECRET || "";
}

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }),
  });
  if (!res.ok) throw new Error(`dexcom token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? null,
    expires_at: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null,
  };
}

// Dexcom EGV timestamps are local "YYYY-MM-DDTHH:mm:ss" (no zone); take the date prefix.
function dayOf(systemTime: string): string {
  return systemTime.slice(0, 10);
}

export const dexcomProvider: SyncProvider = {
  slug: "dexcom",
  label: "Dexcom",
  module: "wearables",
  cadenceMinutes: 60 * 6,
  requiresOAuth: true,
  isConfigured: () => Boolean(clientId() && clientSecret()),
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
    // Dexcom expects local ISO datetimes without a trailing Z.
    const startDate = since.toISOString().slice(0, 19);
    const endDate = new Date().toISOString().slice(0, 19);
    const url = `${EGV}?${new URLSearchParams({ startDate, endDate })}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!res.ok) throw new Error(`dexcom egvs ${res.status}`);
    const j = (await res.json()) as {
      records?: Array<{ systemTime?: string; displayTime?: string; value?: number | null }>;
    };

    // Accumulate per-day: sum, count, in-range count → mean + TIR%.
    type Acc = { sum: number; count: number; inRange: number };
    const byDate = new Map<string, Acc>();
    for (const rec of j.records ?? []) {
      const stamp = rec.displayTime || rec.systemTime;
      if (!stamp || rec.value == null) continue;
      const day = dayOf(stamp);
      const acc = byDate.get(day) ?? { sum: 0, count: 0, inRange: 0 };
      acc.sum += rec.value;
      acc.count += 1;
      if (rec.value >= TIR_LOW && rec.value <= TIR_HIGH) acc.inRange += 1;
      byDate.set(day, acc);
    }

    const out: DailySummary[] = [];
    for (const [date, acc] of byDate) {
      if (acc.count === 0) continue;
      out.push({
        date,
        avg_glucose_mgdl: Math.round(acc.sum / acc.count),
        time_in_range_pct: Math.round((acc.inRange / acc.count) * 1000) / 10,
        raw: { source: "dexcom", date, readings: acc.count },
      });
    }
    return out;
  },
};
