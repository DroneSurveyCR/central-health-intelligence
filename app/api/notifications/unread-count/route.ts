import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner, staffMfaGate } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

// Bell-badge count. Tenant-scoped via the RLS session client (only the caller's
// own practice's notifications are visible). Staff-only: a non-staff caller gets
// { count: 0 } rather than an error, so the bell simply shows nothing.
export async function GET() {
  const me = await getCurrentPractitioner();
  if (!me) return NextResponse.json({ count: 0 });
  if (await staffMfaGate()) return NextResponse.json({ count: 0 });

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return NextResponse.json({ count: count ?? 0 });
}
