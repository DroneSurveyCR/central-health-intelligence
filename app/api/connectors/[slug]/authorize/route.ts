import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { getSyncProvider } from "@/lib/connectors/sync/registry";
import { signState } from "@/lib/connectors/sync/state";

export const dynamic = "force-dynamic";

// Start an OAuth connect for a patient's device. Gated on the owning module
// (wearables) — connectors bypass RLS, so this route guard is load-bearing.
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const provider = getSyncProvider(slug);
  if (!provider) return NextResponse.json({ error: "unknown connector" }, { status: 404 });

  // Module gate (redirects to /upgrade if the practice lacks it).
  await requireModule(provider.module as Parameters<typeof requireModule>[0]);

  const { user } = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const patientId = new URL(request.url).searchParams.get("patientId") || "";
  if (!patientId) return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  // RLS scopes this read — resolves practice_id AND proves the caller may access the patient.
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, practice_id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return NextResponse.json({ error: "patient not found" }, { status: 403 });

  if (provider.requiresOAuth && !provider.isConfigured())
    return NextResponse.json(
      { error: `${provider.label} is not configured yet (awaiting OAuth app credentials).` },
      { status: 503 },
    );

  const redirectUri = `${new URL(request.url).origin}/api/connectors/${slug}/callback`;
  const state = signState({ practice_id: patient.practice_id as string, patient_id: patientId, slug });
  return NextResponse.redirect(provider.authorizeUrl(state, redirectUri));
}
