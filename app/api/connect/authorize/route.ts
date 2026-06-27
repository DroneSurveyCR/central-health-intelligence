import { NextResponse } from "next/server";
import { getCurrentPractice } from "@/lib/billing/practice";
import { connectEnabled, connectAuthorizeUrl } from "@/lib/billing/connect";
import { signState } from "@/lib/connectors/sync/state";

export const dynamic = "force-dynamic";

// Start Stripe Connect onboarding for the caller's clinic (admin/doctor only).
export async function GET(request: Request) {
  const practice = await getCurrentPractice();
  if (!practice) return NextResponse.redirect(new URL("/login", request.url));
  if (practice.role !== "admin" && practice.role !== "doctor")
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  if (!connectEnabled())
    return NextResponse.json(
      { error: "Stripe Connect is not configured yet (set STRIPE_CONNECT_CLIENT_ID)." },
      { status: 503 },
    );

  const redirectUri = `${new URL(request.url).origin}/api/connect/callback`;
  const state = signState({ practice_id: practice.id, patient_id: practice.id, slug: "connect" });
  return NextResponse.redirect(connectAuthorizeUrl(state, redirectUri));
}
