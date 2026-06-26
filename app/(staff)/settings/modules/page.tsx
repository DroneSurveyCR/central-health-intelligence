import { requireStaff } from "@/lib/auth/roles";
import { MODULES } from "@/lib/modules/manifest";
import { getEnabledModules } from "@/lib/modules/requireModule";
import type { ModuleDef } from "@/lib/modules/types";
import ModuleToggle from "./ModuleToggle";

export default async function ModulesPage() {
  await requireStaff(["doctor", "admin"]);
  const enabled = await getEnabledModules();
  const modules = Object.values(MODULES) as ModuleDef[];

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Modules
      </h1>
      <p className="muted">Turn modules on or off for your practice.</p>

      <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
        {modules.map((m) => {
          const locked = !!m.alwaysOn;
          return (
            <li key={m.id} style={rowStyle}>
              <div style={{ minWidth: 150, flex: 1 }}>
                <b>{m.label}</b>{" "}
                <span className="muted">{m.price ? `$${m.price}/mo` : "included"}</span>
              </div>
              <ModuleToggle moduleId={m.id} enabled={enabled.has(m.id)} locked={locked} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 10,
  marginBottom: 8,
} as const;
