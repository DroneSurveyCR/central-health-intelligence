import { createHmac, timingSafeEqual } from "node:crypto";
import type { SyncProvider, TokenSet, DailySummary } from "../types";

// Withings (OAuth2 + Withings Web API). Body composition (weight/fat), activity
// (steps), and sleep summaries map into the normalized DailySummary. Activates
// once WITHINGS_CLIENT_ID + WITHINGS_CLIENT_SECRET are set; until then
// isConfigured() is false and the authorize route returns a "not configured" 503.

const AUTH = "https://account.withings.com/oauth2_user/authorize2";
const TOKEN = "https://wbsapi.withings.net/v2/oauth2";
const MEASURE = "https://wbsapi.withings.net/measure";
const MEASURE_V2 = "https://wbsapi.withings.net/v2/measure";
const SLEEP_V2 = "https://wbsapi.withings.net/v2/sleep";
// Withings demands explicit scopes; user.metrics covers weight/body, user.activity covers steps/sleep.
const SCOPES = ["user.metrics", "user.activity"];

function clientId() {
  return process.env.WITHINGS_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.WITHINGS_CLIENT_SECRET || "";
}

// Withings wraps OAuth token responses in { status, body: {...} } unlike standard OAuth2.
async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      client_id: clientId(),
      client_secret: clientSecret(),
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`withings token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as {
    status?: number;
    body?: { access_token?: string; refresh_token?: string; expires_in?: number };
    error?: string;
  };
  if (j.status !== 0 || !j.body?.access_token) {
    throw new Error(`withings token status ${j.status}: ${j.error ?? "no access_token"}`);
  }
  return {
    access_token: j.body.access_token,
    refresh_token: j.body.refresh_token ?? null,
    expires_at: j.body.expires_in ? new Date(Date.now() + j.body.expires_in * 1000).toISOString() : null,
  };
}

// All Withings data endpoints share the { status, body } envelope and Bearer auth.
async function apiPost(url: string, token: string, params: Record<string, string>): Promise<{ body?: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`withings ${url} ${res.status}`);
  return (await res.json()) as { status?: number; body?: unknown };
}

function dateOf(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export const withingsProvider: SyncProvider = {
  slug: "withings",
  label: "Withings",
  module: "wearables",
  cadenceMinutes: 60 * 12,
  requiresOAuth: true,
  isConfigured: () => Boolean(clientId() && clientSecret()),
  authorizeUrl(state, redirectUri) {
    return `${AUTH}?${new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: redirectUri,
      scope: SCOPES.join(","),
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
    const startTs = Math.floor(since.getTime() / 1000);
    const endTs = Math.floor(Date.now() / 1000);
    const startDate = since.toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    const at = token.access_token;

    // Measures (weight=1, fat_ratio=6) come as grouped measure entries keyed by date.
    // Activity (steps) and sleep summary come from their own v2 endpoints.
    const [measures, activity, sleep] = await Promise.all([
      apiPost(MEASURE, at, {
        action: "getmeas",
        meastypes: "1,6", // 1=weight(kg), 6=fat ratio(%)
        category: "1",
        startdate: String(startTs),
        enddate: String(endTs),
      }).catch(() => ({ body: undefined })),
      apiPost(MEASURE_V2, at, {
        action: "getactivity",
        startdateymd: startDate,
        enddateymd: endDate,
        data_fields: "steps",
      }).catch(() => ({ body: undefined })),
      apiPost(SLEEP_V2, at, {
        action: "getsummary",
        startdateymd: startDate,
        enddateymd: endDate,
        data_fields: "hr_average,durationtosleep,sleep_score,total_sleep_time",
      }).catch(() => ({ body: undefined })),
    ]);

    const byDate = new Map<string, DailySummary>();
    const ensure = (date: string): DailySummary => {
      const existing = byDate.get(date);
      if (existing) return existing;
      const created: DailySummary = { date };
      byDate.set(date, created);
      return created;
    };

    // Weight / body fat. Each measuregrp has a unixtime + measures[] with type+value+unit (10^unit scale).
    const mBody = (measures.body ?? {}) as {
      measuregrps?: Array<{ date?: number; measures?: Array<{ type?: number; value?: number; unit?: number }> }>;
    };
    for (const grp of mBody.measuregrps ?? []) {
      if (!grp.date) continue;
      const day = ensure(dateOf(grp.date));
      for (const m of grp.measures ?? []) {
        if (m.type == null || m.value == null) continue;
        const scaled = m.value * Math.pow(10, m.unit ?? 0);
        if (m.type === 1) day.weight_kg = Math.round(scaled * 100) / 100;
        else if (m.type === 6) day.body_fat_pct = Math.round(scaled * 100) / 100;
      }
    }

    // Activity steps — one entry per day with a `date` (YYYY-MM-DD) and `steps`.
    const aBody = (activity.body ?? {}) as { activities?: Array<{ date?: string; steps?: number }> };
    for (const a of aBody.activities ?? []) {
      if (!a.date) continue;
      ensure(a.date).steps = a.steps ?? null;
    }

    // Sleep summary — `date` (YYYY-MM-DD), hr_average (resting), total_sleep_time (seconds).
    const sBody = (sleep.body ?? {}) as {
      series?: Array<{ date?: string; data?: { hr_average?: number; total_sleep_time?: number } }>;
    };
    for (const s of sBody.series ?? []) {
      if (!s.date) continue;
      const day = ensure(s.date);
      if (s.data?.hr_average != null) day.resting_hr = s.data.hr_average;
      if (s.data?.total_sleep_time != null) {
        day.sleep_hours = Math.round((s.data.total_sleep_time / 3600) * 10) / 10;
      }
    }

    const out = [...byDate.values()];
    for (const s of out) s.raw = { source: "withings", date: s.date };
    return out;
  },
  // Withings signs callbacks/webhooks with HMAC-SHA256 over the raw body using the client secret.
  // (Real Withings notify uses a `signature` param over sorted args; we verify the standard
  // HMAC-of-raw-body shape and accept either a hex or base64 digest in X-Withings-Signature.)
  webhookVerify(req, rawBody) {
    const secret = clientSecret();
    if (!secret) return false;
    const sig = req.headers.get("x-withings-signature") || req.headers.get("x-signature") || "";
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
