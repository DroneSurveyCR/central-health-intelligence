import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyState } from "@/lib/connectors/sync/state";
import { exchangeConnectCode } from "@/lib/billing/connect";

export const dynamic = "force-dynamic";

// Stripe Connect OAuth redirect target. Stores the clinic's connected account id.
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error"))
    return NextResponse.redirect(new URL("/settings/payments?error=denied", request.url));

  const code = url.searchParams.get("code") || "";
  const payload = verifyState(url.searchParams.get("state") || "");
  if (!payload || payload.slug !== "connect")
    return NextResponse.json({ error: "invalid or expired state" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  let acct: string;
  try {
    acct = (await exchangeConnectCode(code)).stripe_user_id;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "connect failed" }, { status: 502 });
  }

  const admin = createAdminClient();
  await admin
    .from("practices")
    .update({
      stripe_connect_account_id: acct,
      stripe_connect_status: "connected",
      stripe_connected_at: new Date().toISOString(),
    })
    .eq("id", payload.practice_id);

  return NextResponse.redirect(new URL("/settings/payments?connected=1", request.url));
}
