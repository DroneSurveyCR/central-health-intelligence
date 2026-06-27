import type { SyncProvider, TokenSet, DailySummary } from "../types";

// Sandbox provider: proves the full OAuth→pull→normalize→upsert loop end-to-end
// with NO external credentials. "Authorizing" round-trips straight to the callback;
// pull() synthesizes deterministic daily summaries so a demo tenant sees real rows.
// This is how we validate the engine before Oura/Withings/Dexcom dev-apps are approved.

function seeded(dateStr: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000; // 0..1
}

function daysBetween(since: Date, until: Date): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()));
  const end = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate()));
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out.slice(-90); // cap a backfill at 90 days
}

export const sandboxProvider: SyncProvider = {
  slug: "sandbox",
  label: "Sandbox (demo data)",
  module: "wearables",
  cadenceMinutes: 60 * 24,
  requiresOAuth: false,
  isConfigured: () => true,
  authorizeUrl(state, redirectUri) {
    // Short-circuit consent: bounce straight back to our callback with a grant.
    const sep = redirectUri.includes("?") ? "&" : "?";
    return `${redirectUri}${sep}code=sandbox-grant&state=${encodeURIComponent(state)}`;
  },
  async exchangeCode() {
    return {
      access_token: "sandbox-access",
      refresh_token: "sandbox-refresh",
      expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      scopes: ["daily"],
    } satisfies TokenSet;
  },
  async refresh() {
    return {
      access_token: "sandbox-access",
      refresh_token: "sandbox-refresh",
      expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    } satisfies TokenSet;
  },
  async pull(_token, since) {
    const today = new Date();
    return daysBetween(since, today).map((date): DailySummary => {
      const r = (s: number) => seeded(date, s);
      return {
        date,
        resting_hr: Math.round(52 + r(7) * 16), // 52–68
        hrv_ms: Math.round(35 + r(13) * 65), // 35–100
        sleep_hours: Math.round((6 + r(3) * 2.5) * 10) / 10, // 6.0–8.5
        sleep_efficiency: Math.round((82 + r(5) * 15) * 10) / 10,
        steps: Math.round(3000 + r(11) * 12000),
        readiness_score: Math.round(60 + r(17) * 35),
        spo2_avg: Math.round((95 + r(19) * 3) * 10) / 10,
        raw: { source: "sandbox", date },
      };
    });
  },
};
