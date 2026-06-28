import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAlerts } from "@/lib/alerts/engine";
import { authorizeCron } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Alerting tick (Vercel Cron). Evaluates every practice's enabled alert_rules
// against each patient's latest wearable summary and inserts breach alerts.
// Protected by CRON_SECRET. Idempotent and safe to over-run (dedup index).
const authorized = authorizeCron;

async function run() {
  const created = await evaluateAlerts(createAdminClient());
  return { created };
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await run()) });
}
