import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { MODULES, DEFAULT_ON } from "@/lib/modules/manifest";
import type { ModuleDef } from "@/lib/modules/types";
import NewInstanceForm, { type Mod } from "./NewInstanceForm";

export const dynamic = "force-dynamic";

export default async function NewInstancePage() {
  await requireSuperAdmin();

  const mods: Mod[] = (Object.values(MODULES) as ModuleDef[]).map((m) => ({
    id: m.id,
    label: m.label,
    price: m.price,
    alwaysOn: Boolean(m.alwaysOn),
  }));

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px" }}>
      <Link href="/superadmin" className="muted" style={{ fontSize: 13 }}>← All practices</Link>
      <h1 className="serif" style={{ fontSize: 26, margin: "10px 0 2px" }}>Set up a new instance</h1>
      <p className="muted" style={{ margin: "0 0 18px", fontSize: 13 }}>
        Create a client&apos;s practice, pick their modules, and get a login link to hand off.
      </p>
      <NewInstanceForm modules={mods} defaultOn={DEFAULT_ON as string[]} />
    </div>
  );
}
