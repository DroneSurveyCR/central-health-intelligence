import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSyncProvider } from "@/lib/connectors/sync/registry";
import { verifyState } from "@/lib/connectors/sync/state";
import { storeToken, enqueueBackfill } from "@/lib/connectors/sync/engine";

export const dynamic = "force-dynamic";

// OAuth redirect target. Exchanges the code, stores the (encrypted-at-rest) token
// keyed to the signed (practice, patient, connector), and enqueues a 90-day backfill.
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";

  const provider = getSyncProvider(slug);
  if (!provider) return NextResponse.json({ error: "unknown connector" }, { status: 404 });

  const payload = verifyState(state);
  if (!payload || payload.slug !== slug)
    return NextResponse.json({ error: "invalid or expired state" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const redirectUri = `${url.origin}/api/connectors/${slug}/callback`;
  let token;
  try {
    token = await provider.exchangeCode(code, redirectUri);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "token exchange failed" }, { status: 502 });
  }

  // Admin client: writes carry the explicit practice_id from the signed state.
  const admin = createAdminClient();
  await storeToken(admin, { practice_id: payload.practice_id, patient_id: payload.patient_id, slug, token });
  await enqueueBackfill(admin, { practice_id: payload.practice_id, patient_id: payload.patient_id, slug });

  return NextResponse.redirect(new URL(`/patients/${payload.patient_id}?connected=${slug}`, request.url));
}
