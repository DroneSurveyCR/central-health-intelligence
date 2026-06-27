import type { SyncProvider, TokenSet, DailySummary } from "../types";

// Oura Ring (OAuth2 + v2 API). The plan's recommended "one provider, real OAuth,
// one metric stream end-to-end first". Activates automatically once OURA_CLIENT_ID
// + OURA_CLIENT_SECRET are set (Week-0 dev-app approval); until then isConfigured()
// is false and the authorize route returns a clear "not configured" message.

const AUTH = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN = "https://api.ouraring.com/oauth/token";
const API = "https://api.ouraring.com/v2/usercollection";
const SCOPES = ["daily", "heartrate", "personal"];

function clientId() {
  return process.env.OURA_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.OURA_CLIENT_SECRET || "";
}

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }),
  });
  if (!res.ok) throw new Error(`oura token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? null,
    expires_at: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null,
  };
}

async function getJson(path: string, token: string, qs: Record<string, string>): Promise<{ data?: unknown[] }> {
  const url = `${API}/${path}?${new URLSearchParams(qs)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`oura ${path} ${res.status}`);
  return (await res.json()) as { data?: unknown[] };
}

export const ouraProvider: SyncProvider = {
  slug: "oura",
  label: "Oura Ring",
  module: "wearables",
  cadenceMinutes: 60 * 12,
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
    const start = since.toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);
    const qs = { start_date: start, end_date: end };
    // Merge daily_readiness + daily_sleep by date into one normalized summary.
    const [readiness, sleep] = await Promise.all([
      getJson("daily_readiness", token.access_token, qs).catch(() => ({ data: [] })),
      getJson("daily_sleep", token.access_token, qs).catch(() => ({ data: [] })),
    ]);
    const byDate = new Map<string, DailySummary>();
    for (const r of (readiness.data ?? []) as Array<{ day?: string; score?: number; contributors?: { resting_heart_rate?: number; hrv_balance?: number } }>) {
      if (!r.day) continue;
      byDate.set(r.day, {
        ...(byDate.get(r.day) ?? { date: r.day }),
        date: r.day,
        readiness_score: r.score ?? null,
        resting_hr: r.contributors?.resting_heart_rate ?? null,
        raw: r,
      });
    }
    for (const s of (sleep.data ?? []) as Array<{ day?: string; score?: number }>) {
      if (!s.day) continue;
      byDate.set(s.day, { ...(byDate.get(s.day) ?? { date: s.day }), date: s.day, sleep_efficiency: s.score ?? null });
    }
    return [...byDate.values()];
  },
};
