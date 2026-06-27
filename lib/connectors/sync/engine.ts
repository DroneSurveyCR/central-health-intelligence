import type { AnySupabaseClient } from "../types";
import type { DailySummary, TokenSet } from "./types";
import { getSyncProvider } from "./registry";
import { encryptToken, decryptToken } from "./crypto";

// The sync worker. Runs with the ADMIN (service-role) client — it bypasses RLS, so
// every write MUST carry an explicit practice_id taken from the job/token row.
// Reliability: jobs are claimed atomically (SKIP LOCKED, see migration 005), retried
// with exponential backoff, and capped before going to 'dead'.

const BACKOFF_MIN = [1, 5, 30, 120, 360]; // minutes per attempt
const MAX_ATTEMPTS = 5;

function backoffMs(attempts: number): number {
  const i = Math.min(attempts, BACKOFF_MIN.length) - 1;
  return BACKOFF_MIN[Math.max(i, 0)] * 60 * 1000;
}

type JobRow = {
  id: string;
  practice_id: string;
  patient_id: string;
  connector_slug: string;
  kind: "backfill" | "incremental" | "webhook";
  attempts: number;
  window_start: string | null;
};

type TokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
};

/** Persist (upsert) an OAuth token for a (practice, patient, connector). */
export async function storeToken(
  admin: AnySupabaseClient,
  args: { practice_id: string; patient_id: string; slug: string; token: TokenSet },
): Promise<void> {
  await admin
    .from("connector_oauth_tokens")
    .upsert(
      {
        practice_id: args.practice_id,
        patient_id: args.patient_id,
        connector_slug: args.slug,
        access_token: encryptToken(args.token.access_token),
        refresh_token: args.token.refresh_token ? encryptToken(args.token.refresh_token) : null,
        token_expires_at: args.token.expires_at ?? null,
        scopes: args.token.scopes ?? null,
        status: "connected",
        next_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id,connector_slug" },
    );
}

/** Enqueue a backfill job (first connect) for a token. */
export async function enqueueBackfill(
  admin: AnySupabaseClient,
  args: { practice_id: string; patient_id: string; slug: string; days?: number },
): Promise<void> {
  const start = new Date(Date.now() - (args.days ?? 90) * 24 * 3600 * 1000);
  await admin.from("connector_sync_jobs").insert({
    practice_id: args.practice_id,
    patient_id: args.patient_id,
    connector_slug: args.slug,
    kind: "backfill",
    status: "queued",
    window_start: start.toISOString(),
  });
}

function summaryToRow(practiceId: string, patientId: string, slug: string, s: DailySummary) {
  return {
    practice_id: practiceId,
    patient_id: patientId,
    connector_slug: slug,
    date: s.date,
    resting_hr: s.resting_hr ?? null,
    hrv_ms: s.hrv_ms ?? null,
    sleep_hours: s.sleep_hours ?? null,
    sleep_efficiency: s.sleep_efficiency ?? null,
    steps: s.steps ?? null,
    readiness_score: s.readiness_score ?? null,
    spo2_avg: s.spo2_avg ?? null,
    weight_kg: s.weight_kg ?? null,
    body_fat_pct: s.body_fat_pct ?? null,
    avg_glucose_mgdl: s.avg_glucose_mgdl ?? null,
    time_in_range_pct: s.time_in_range_pct ?? null,
    raw_payload: s.raw ?? null,
  };
}

async function failJob(admin: AnySupabaseClient, job: JobRow, err: string) {
  const dead = job.attempts >= MAX_ATTEMPTS;
  await admin
    .from("connector_sync_jobs")
    .update({
      status: dead ? "dead" : "failed",
      error: err.slice(0, 500),
      next_attempt_at: new Date(Date.now() + backoffMs(job.attempts)).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

/** Claim and run due jobs. Returns a summary of what happened. */
export async function runDueJobs(
  admin: AnySupabaseClient,
  max = 20,
): Promise<{ claimed: number; done: number; failed: number; rowsUpserted: number }> {
  const { data: jobs, error } = await admin.rpc("claim_connector_sync_jobs", { max_jobs: max });
  if (error) throw new Error(`claim failed: ${error.message}`);
  const list = (jobs ?? []) as JobRow[];
  let done = 0,
    failed = 0,
    rowsUpserted = 0;

  for (const job of list) {
    try {
      const provider = getSyncProvider(job.connector_slug);
      if (!provider) throw new Error(`no provider for ${job.connector_slug}`);

      const { data: tok } = await admin
        .from("connector_oauth_tokens")
        .select("access_token, refresh_token, token_expires_at, last_sync_at")
        .eq("practice_id", job.practice_id)
        .eq("patient_id", job.patient_id)
        .eq("connector_slug", job.connector_slug)
        .maybeSingle();
      const token = tok as TokenRow | null;
      if (!token?.access_token) throw new Error("no token on file");

      const since = job.window_start
        ? new Date(job.window_start)
        : token.last_sync_at
          ? new Date(token.last_sync_at)
          : new Date(Date.now() - 7 * 24 * 3600 * 1000);

      const tokenSet: TokenSet = {
        access_token: decryptToken(token.access_token),
        refresh_token: token.refresh_token ? decryptToken(token.refresh_token) : token.refresh_token,
        expires_at: token.token_expires_at,
      };
      const summaries = await provider.pull(tokenSet, since);

      if (summaries.length) {
        const rows = summaries.map((s) => summaryToRow(job.practice_id, job.patient_id, job.connector_slug, s));
        const { error: upErr } = await admin
          .from("wearable_daily_summaries")
          .upsert(rows, { onConflict: "patient_id,connector_slug,date" });
        if (upErr) throw new Error(`upsert: ${upErr.message}`);
        rowsUpserted += rows.length;
      }

      const nowIso = new Date().toISOString();
      await admin.from("connector_sync_jobs").update({ status: "done", error: null, updated_at: nowIso }).eq("id", job.id);
      await admin
        .from("connector_oauth_tokens")
        .update({
          last_sync_at: nowIso,
          next_sync_at: new Date(Date.now() + provider.cadenceMinutes * 60 * 1000).toISOString(),
          updated_at: nowIso,
        })
        .eq("practice_id", job.practice_id)
        .eq("patient_id", job.patient_id)
        .eq("connector_slug", job.connector_slug);
      done++;
    } catch (e) {
      failed++;
      await failJob(admin, job, e instanceof Error ? e.message : String(e));
    }
  }

  return { claimed: list.length, done, failed, rowsUpserted };
}

/** Enqueue incremental jobs for every connected token whose cadence is due. */
export async function scheduleDueTokens(admin: AnySupabaseClient): Promise<number> {
  const { data: due } = await admin
    .from("connector_oauth_tokens")
    .select("practice_id, patient_id, connector_slug")
    .eq("status", "connected")
    .lte("next_sync_at", new Date().toISOString())
    .limit(200);
  const tokens = (due ?? []) as Array<{ practice_id: string; patient_id: string; connector_slug: string }>;
  for (const t of tokens) {
    await admin.from("connector_sync_jobs").insert({
      practice_id: t.practice_id,
      patient_id: t.patient_id,
      connector_slug: t.connector_slug,
      kind: "incremental",
      status: "queued",
    });
    // push next_sync_at forward so we don't double-enqueue before the job runs
    await admin
      .from("connector_oauth_tokens")
      .update({ next_sync_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString() })
      .eq("practice_id", t.practice_id)
      .eq("patient_id", t.patient_id)
      .eq("connector_slug", t.connector_slug);
  }
  return tokens.length;
}

/** Refresh access tokens expiring within 24h; mark reauth_required on failure. */
export async function refreshExpiringTokens(admin: AnySupabaseClient): Promise<number> {
  const soon = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { data: expiring } = await admin
    .from("connector_oauth_tokens")
    .select("practice_id, patient_id, connector_slug, refresh_token")
    .eq("status", "connected")
    .not("token_expires_at", "is", null)
    .lte("token_expires_at", soon)
    .limit(200);
  const list = (expiring ?? []) as Array<{ practice_id: string; patient_id: string; connector_slug: string; refresh_token: string | null }>;
  let refreshed = 0;
  for (const t of list) {
    const provider = getSyncProvider(t.connector_slug);
    if (!provider?.refresh || !t.refresh_token) continue;
    try {
      const next = await provider.refresh(decryptToken(t.refresh_token));
      await admin
        .from("connector_oauth_tokens")
        .update({
          access_token: encryptToken(next.access_token),
          refresh_token: next.refresh_token ? encryptToken(next.refresh_token) : t.refresh_token,
          token_expires_at: next.expires_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("practice_id", t.practice_id)
        .eq("patient_id", t.patient_id)
        .eq("connector_slug", t.connector_slug);
      refreshed++;
    } catch {
      await admin
        .from("connector_oauth_tokens")
        .update({ status: "reauth_required", updated_at: new Date().toISOString() })
        .eq("practice_id", t.practice_id)
        .eq("patient_id", t.patient_id)
        .eq("connector_slug", t.connector_slug);
    }
  }
  return refreshed;
}
