import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshExpiringTokens, scheduleDueTokens, runDueJobs } from "@/lib/connectors/sync/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduler tick (Vercel Cron). Refresh expiring tokens → enqueue due tokens →
// drain the job queue. Protected by CRON_SECRET. Idempotent and safe to over-run.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const qs = new URL(request.url).searchParams.get("secret");
  return auth === secret || qs === secret;
}

async function run() {
  const admin = createAdminClient();
  const refreshed = await refreshExpiringTokens(admin);
  const scheduled = await scheduleDueTokens(admin);
  const drained = await runDueJobs(admin, 50);
  return { refreshed, scheduled, ...drained };
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}
