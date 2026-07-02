import { requireSuperAdminApi } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID = new Set(["2d", "3d", "both"]);

/**
 * Super-admin sets which spine viewer a tenant sees (the `chiro` module):
 * 2D map, 3D viewer, or both. Stored at practices.settings.spine_viewer.
 * Same super-admin gate as the module override.
 */
export async function PATCH(request: Request) {
  const gate = await requireSuperAdminApi();
  if (!gate.ok) return gate.response;

  const { practiceId, viewer } = (await request.json().catch(() => ({}))) as {
    practiceId?: string;
    viewer?: string;
  };
  if (!practiceId) return NextResponse.json({ error: "missing practiceId" }, { status: 400 });
  if (!viewer || !VALID.has(viewer))
    return NextResponse.json({ error: "viewer must be 2d, 3d or both" }, { status: 400 });

  const admin = createAdminClient();
  const { data: practice, error: rErr } = await admin
    .from("practices")
    .select("settings")
    .eq("id", practiceId)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!practice) return NextResponse.json({ error: "practice not found" }, { status: 404 });

  const settings = { ...((practice.settings as Record<string, unknown>) ?? {}), spine_viewer: viewer };
  const { error: uErr } = await admin.from("practices").update({ settings }).eq("id", practiceId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, viewer });
}
