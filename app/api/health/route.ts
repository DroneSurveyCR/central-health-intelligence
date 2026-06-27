import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

// Public liveness/readiness probe. NO auth, NO PHI — only a trivial connectivity
// check (head count on a small, non-PHI table) so uptime monitors and Vercel can
// tell whether the app can reach the database. Fast and side-effect free.
export async function GET() {
  let db: "ok" | "degraded" = "degraded";
  try {
    const admin = createAdminClient();
    // `head: true` issues a COUNT with no row payload — cheapest possible probe.
    const { error } = await admin.from("practices").select("id", { head: true, count: "exact" });
    db = error ? "degraded" : "ok";
    if (error) log.warn("health_db_degraded", { error_message: error.message });
  } catch (e) {
    db = "degraded";
    log.warn("health_db_unreachable", { error_message: e instanceof Error ? e.message : String(e) });
  }

  const status = db === "ok" ? "ok" : "degraded";
  return NextResponse.json(
    { status, db, time: new Date().toISOString() },
    { status: status === "ok" ? 200 : 503 },
  );
}
