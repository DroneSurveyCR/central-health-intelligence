import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { hasModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import {
  isReportKey,
  runReport,
  reportToCSV,
  normalizeMonth,
  csvFilename,
} from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/[report]?month=YYYY-MM
 * Returns the report as a CSV download. Tenant-scoped via RLS (createClient),
 * staff-gated, and module-gated on "reports".
 *   report ∈ { daily-transactions, invoices, outstanding }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  // staff gate (+ MFA step-up)
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;

  // module gate (Layer B) — API routes can't redirect cleanly, so 403.
  if (!(await hasModule("reports"))) {
    return NextResponse.json({ error: "module_not_enabled" }, { status: 403 });
  }

  const { report } = await params;
  if (!isReportKey(report)) {
    return NextResponse.json({ error: "unknown_report" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const month = normalizeMonth(searchParams.get("month"));

  const supabase = await createClient();
  const data = await runReport(supabase, report, month);

  await logAudit({
    action: "export",
    resource: `report:${report}`,
    resourceId: null,
  });

  const csv = reportToCSV(data);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${csvFilename(report, month)}"`,
      "cache-control": "no-store",
    },
  });
}
