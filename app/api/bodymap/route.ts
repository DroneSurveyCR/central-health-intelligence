import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Per-patient body-map dataset for the /bodymap viewers (2D + 3D).
// RLS-scoped: a patient only sees their own scan; staff see patients they can access.
// `?patient=<id>` is used by the staff view; the patient view omits it (resolves to self).
export const dynamic = "force-dynamic";

type Bodymap = {
  scanDate?: string | null;
  parts?: Record<string, unknown>;
  cross?: unknown[];
};

export async function GET(req: Request) {
  const supabase = await createClient();
  const patient = new URL(req.url).searchParams.get("patient");

  let q = supabase
    .from("scans")
    .select("id, scan_date, bodymap")
    .order("scan_date", { ascending: false, nullsFirst: false })
    .limit(1);
  if (patient) q = q.eq("patient_id", patient);

  const { data, error } = await q.maybeSingle();
  if (error || !data) {
    return NextResponse.json({ hasScan: false }, { headers: { "Cache-Control": "no-store" } });
  }
  const bm = data.bodymap as Bodymap | null;
  if (!bm || !bm.parts || Object.keys(bm.parts).length === 0) {
    return NextResponse.json({ hasScan: false, scanDate: data.scan_date }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { hasScan: true, scanDate: bm.scanDate ?? data.scan_date, parts: bm.parts, cross: bm.cross ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
