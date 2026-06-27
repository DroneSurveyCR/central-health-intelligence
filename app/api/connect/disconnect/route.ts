import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPractice } from "@/lib/billing/practice";
import { deauthorizeConnect } from "@/lib/billing/connect";

export const dynamic = "force-dynamic";

// Disconnect the clinic's Stripe account (admin/doctor only).
export async function POST() {
  const practice = await getCurrentPractice();
  if (!practice) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practice.role !== "admin" && practice.role !== "doctor")
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  if (practice.stripe_connect_account_id) {
    try {
      await deauthorizeConnect(practice.stripe_connect_account_id);
    } catch {
      // Even if deauthorize fails (already revoked), clear our side.
    }
  }
  const admin = createAdminClient();
  await admin
    .from("practices")
    .update({ stripe_connect_account_id: null, stripe_connect_status: "disconnected", stripe_connected_at: null })
    .eq("id", practice.id);

  return NextResponse.json({ ok: true });
}
