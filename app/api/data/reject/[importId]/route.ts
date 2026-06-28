import { getCurrentPractitioner, getSessionUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const { user } = await getSessionUser();
  const me = await getCurrentPractitioner();
  if (!me || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { importId } = await params;
  const { reason } = await request.json().catch(() => ({})) as { reason?: string };
  const admin = createAdminClient();

  // Admin client bypasses RLS — scope to the caller's practice or a foreign importId is a cross-tenant write/DoS.
  const { data: job } = await admin.from("health_data_imports").select("status").eq("id", importId).eq("practice_id", me.practice_id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Import not found" }, { status: 404 });
  if (job.status === "confirmed") return NextResponse.json({ error: "Cannot reject a confirmed import" }, { status: 409 });

  await admin.from("health_data_imports").update({
    status: "rejected",
    reviewer_notes: reason ?? null,
    confirmed_by: user.id,
    confirmed_at: new Date().toISOString(),
  }).eq("id", importId).eq("practice_id", me.practice_id);

  return NextResponse.json({ importId, status: "rejected" });
}
