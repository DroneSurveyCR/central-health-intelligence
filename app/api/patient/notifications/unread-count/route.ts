import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";

// GET { count } — number of unread notifications addressed to the logged-in
// patient. RLS scopes to the practice; we additionally pin recipient_patient_id
// so the count only ever reflects this patient's own notifications.
export async function GET() {
  const me = await getCurrentPatient();
  if (!me) return NextResponse.json({ count: 0 }, { status: 401 });

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_patient_id", me.id)
    .is("read_at", null);

  return NextResponse.json({ count: count ?? 0 });
}
