import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { REPORTS, runReport, toCSV, type ReportKey } from "@/lib/reports/queries";
import { NextResponse } from "next/server";

const KEYS = REPORTS.map((r) => r.key) as string[];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** GET /api/reports/[report]?from=&to= — returns the report as a CSV download. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { report } = await params;
  if (!KEYS.includes(report))
    return NextResponse.json({ error: "unknown report" }, { status: 404 });

  const def = defaultRange();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || def.from;
  const to = searchParams.get("to") || def.to;

  const supabase = await createClient();
  const data = await runReport(supabase, report as ReportKey, from, to);

  await logAudit({ action: "export", resource: `report:${report}`, resourceId: null });

  const csv = toCSV(data);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${report}_${from}_${to}.csv"`,
    },
  });
}
