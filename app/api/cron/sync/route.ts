import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshExpiringTokens, scheduleDueTokens, runDueJobs } from "@/lib/connectors/sync/engine";
import { captureError } from "@/lib/observability/logger";
import { authorizeCron } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduler tick (Vercel Cron). Refresh expiring tokens → enqueue due tokens →
// drain the job queue. Protected by CRON_SECRET. Idempotent and safe to over-run.
const authorized = authorizeCron;

async function run() {
  try {
    const admin = createAdminClient();
    const refreshed = await refreshExpiringTokens(admin);
    const scheduled = await scheduleDueTokens(admin);
    const drained = await runDueJobs(admin, 50);
    return { refreshed, scheduled, ...drained };
  } catch (err) {
    // Surface the failure to observability, then rethrow unchanged.
    await captureError(err, { route: "cron/sync" });
    throw err;
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}
