// Real-time connector SYNC layer (OAuth-pull / webhook providers), distinct from
// the file-upload connectors in ../types.ts. This is the moat: authorize once,
// then a scheduler pulls normalized daily summaries on a cadence.

/** One normalized day of wearable/CGM data → upserts to wearable_daily_summaries. */
export type DailySummary = {
  date: string; // YYYY-MM-DD
  resting_hr?: number | null;
  hrv_ms?: number | null;
  sleep_hours?: number | null;
  sleep_efficiency?: number | null;
  steps?: number | null;
  readiness_score?: number | null;
  spo2_avg?: number | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  avg_glucose_mgdl?: number | null;
  time_in_range_pct?: number | null;
  raw?: unknown;
};

export type TokenSet = {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null; // ISO timestamp
  scopes?: string[];
};

export interface SyncProvider {
  readonly slug: string;
  readonly label: string;
  /** Owning module id — the import/authorize routes gate on this. */
  readonly module: string;
  /** Pull cadence in minutes (scheduler honors per-token next_sync_at). */
  readonly cadenceMinutes: number;
  /** Real provider needs external OAuth credentials; sandbox does not. */
  readonly requiresOAuth: boolean;
  /** True once the provider's external app credentials are configured in env. */
  isConfigured(): boolean;
  /** Provider consent URL. `state` is an opaque signed token. */
  authorizeUrl(state: string, redirectUri: string): string;
  /** Exchange an auth code for tokens. */
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
  /** Refresh an access token (optional — sandbox has none). */
  refresh?(refreshToken: string): Promise<TokenSet>;
  /** Pull normalized daily summaries from `since` (inclusive) to now. */
  pull(token: TokenSet, since: Date): Promise<DailySummary[]>;
  /**
   * Optional webhook authenticity check (e.g. HMAC of the raw body with the provider
   * secret). When present, the webhook route MUST call it and reject (401) on failure
   * before enqueuing. Providers without it keep the accept-stub behavior.
   */
  webhookVerify?(req: Request, rawBody: string): boolean | Promise<boolean>;
}
