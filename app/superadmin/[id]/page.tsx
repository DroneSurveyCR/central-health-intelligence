import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULES } from "@/lib/modules/manifest";
import type { ModuleDef } from "@/lib/modules/types";
import ModuleOverride, { type Mod } from "./ModuleOverride";
import SpineViewerToggle from "./SpineViewerToggle";

export const dynamic = "force-dynamic";

export default async function SuperAdminPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const admin = createAdminClient();
  const [{ data: practice }, { count: patients }, { count: staff }] = await Promise.all([
    admin
      .from("practices")
      .select("id, slug, name, plan, vertical, region, modules, settings, created_at")
      .eq("id", id)
      .maybeSingle(),
    admin.from("patients").select("id", { count: "exact", head: true }).eq("practice_id", id),
    admin.from("practitioners").select("id", { count: "exact", head: true }).eq("practice_id", id),
  ]);

  if (!practice) notFound();

  const enabled = new Set<string>((practice.modules as string[]) ?? []);
  const mods: Mod[] = (Object.values(MODULES) as ModuleDef[]).map((m) => ({
    id: m.id,
    label: m.label,
    price: m.price,
    alwaysOn: Boolean(m.alwaysOn),
    enabled: Boolean(m.alwaysOn) || enabled.has(m.id),
  }));

  const chiroOn = enabled.has("chiro");
  const spineViewer =
    ((practice.settings as Record<string, unknown> | null)?.spine_viewer as string) ?? "both";

  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 14 };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
      <Link href="/superadmin" className="muted" style={{ fontSize: 13 }}>← All practices</Link>

      <h1 className="serif" style={{ fontSize: 26, margin: "10px 0 2px" }}>{practice.name}</h1>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{practice.slug}</p>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={row}><span className="muted">Plan</span><span><span className="badge">{practice.plan}</span></span></div>
        <div style={row}><span className="muted">Vertical</span><span>{practice.vertical ?? "—"}</span></div>
        <div style={row}><span className="muted">Region</span><span>{practice.region}</span></div>
        <div style={row}><span className="muted">Patients</span><span>{patients ?? 0}</span></div>
        <div style={{ ...row, borderBottom: "none" }}><span className="muted">Staff</span><span>{staff ?? 0}</span></div>
      </div>

      <h2 className="serif" style={{ fontSize: 19, margin: "26px 0 4px" }}>Modules</h2>
      <p className="muted" style={{ fontSize: 13, margin: "0 0 14px" }}>
        Override what this instance has enabled. Changes are immediate; dependencies are added automatically.
      </p>
      <ModuleOverride practiceId={practice.id} modules={mods} />

      {chiroOn && (
        <>
          <h2 className="serif" style={{ fontSize: 19, margin: "26px 0 4px" }}>Spine viewer</h2>
          <p className="muted" style={{ fontSize: 13, margin: "0 0 14px" }}>
            Which spine visualization this clinic sees — 2D map, 3D viewer, or both.
          </p>
          <SpineViewerToggle practiceId={practice.id} current={spineViewer} />
        </>
      )}
    </div>
  );
}
