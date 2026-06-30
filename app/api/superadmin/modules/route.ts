import { requireSuperAdminApi } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { setPracticeModule } from "@/lib/modules/setModule";
import { NextResponse } from "next/server";

/**
 * Super-admin module override for ANY tenant. Gated to the platform super-admin
 * (email allowlist + MFA step-up), writes via the service-role client through the
 * shared `setPracticeModule` helper (same enable/dependency logic as the staff toggle).
 */
export async function PATCH(request: Request) {
  const gate = await requireSuperAdminApi();
  if (!gate.ok) return gate.response;

  const { practiceId, moduleId, enabled } = (await request.json().catch(() => ({}))) as {
    practiceId?: string;
    moduleId?: string;
    enabled?: boolean;
  };
  if (!practiceId) return NextResponse.json({ error: "missing practiceId" }, { status: 400 });

  const result = await setPracticeModule(createAdminClient(), practiceId, String(moduleId), Boolean(enabled));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, modules: result.modules });
}
