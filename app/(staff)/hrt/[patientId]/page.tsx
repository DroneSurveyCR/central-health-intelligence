import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import HrtProtocolBuilder from "./HrtProtocolBuilder";
import HrtAdministrationLogger from "./HrtAdministrationLogger";

type Administration = {
  id: string;
  created_at: string;
  dose: number;
  dose_unit: string | null;
  route: string | null;
  injection_site: string | null;
  side_effects: string[] | null;
  side_effect_severity: number | null;
  notes: string | null;
};

type Protocol = {
  id: string;
  hormone: string;
  route: string | null;
  current_dose: number;
  dose_unit: string | null;
  frequency: string | null;
  start_date: string;
  current_week: number;
  goal: string | null;
  status: string;
  hrt_administrations: Administration[] | null;
};

type LabResult = {
  marker: string;
  value: number;
  unit: string | null;
  optimal_low: number | null;
  optimal_high: number | null;
  collected_on: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "var(--berry)",
  paused: "var(--muted)",
  completed: "var(--muted)",
  discontinued: "var(--muted)",
};

// Hormone-relevant lab markers surfaced in the monitoring panel.
const HORMONE_MARKERS = [
  "testosterone",
  "free testosterone",
  "estradiol",
  "estrogen",
  "progesterone",
  "dhea",
  "dhea-s",
  "shbg",
  "lh",
  "fsh",
  "tsh",
  "free t3",
  "free t4",
  "t3",
  "t4",
  "prolactin",
  "psa",
  "hematocrit",
];

/** Optimal-range colour: green in-range, amber out-of-range, muted unknown. */
function rangeColor(l: LabResult): string {
  if (l.optimal_low == null && l.optimal_high == null) return "var(--muted)";
  const lowOk = l.optimal_low == null || l.value >= l.optimal_low;
  const highOk = l.optimal_high == null || l.value <= l.optimal_high;
  return lowOk && highOk ? "var(--berry)" : "#c2410c";
}

export default async function StaffHrtPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("hrt");
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return (
      <p className="muted">
        Client not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "hrt", patientId });

  const { data: protocolData } = await supabase
    .from("hrt_protocols")
    .select(
      "id, hormone, route, current_dose, dose_unit, frequency, start_date, current_week, goal, status, hrt_administrations(id, created_at, dose, dose_unit, route, injection_site, side_effects, side_effect_severity, notes)",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const { data: labData } = await supabase
    .from("lab_results")
    .select("marker, value, unit, optimal_low, optimal_high, collected_on")
    .eq("patient_id", patientId)
    .order("collected_on", { ascending: false });

  const protocols = (protocolData ?? []) as Protocol[];

  // Most recent value per hormone-relevant marker.
  const allLabs = (labData ?? []) as LabResult[];
  const seen = new Set<string>();
  const labs: LabResult[] = [];
  for (const l of allLabs) {
    const key = l.marker.trim().toLowerCase();
    if (!HORMONE_MARKERS.includes(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    labs.push(l);
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Back to record
        </Link>
      </div>
      <p className="muted">Hormone optimization (TRT &amp; women&apos;s HRT)</p>

      <HrtProtocolBuilder patientId={patientId} />

      {labs.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
            Recent labs
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Marker</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Optimal</th>
                <th style={thStyle}>Collected</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l) => (
                <tr key={l.marker}>
                  <td style={tdStyle}>{l.marker}</td>
                  <td style={{ ...tdStyle, color: rangeColor(l), fontWeight: 600 }}>
                    {l.value}
                    {l.unit ? ` ${l.unit}` : ""}
                  </td>
                  <td style={tdStyle}>
                    {l.optimal_low ?? "—"}–{l.optimal_high ?? "—"}
                  </td>
                  <td style={tdStyle}>{l.collected_on?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {protocols.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>No protocols yet.</p>
        </div>
      ) : (
        protocols.map((proto) => {
          const unit = proto.dose_unit ?? "mg";
          const admins = (proto.hrt_administrations ?? [])
            .slice()
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 8);
          return (
            <section key={proto.id} className="card" style={{ marginTop: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  className="serif"
                  style={{ fontSize: 20, margin: 0, flex: 1 }}
                >
                  {proto.hormone}
                </h2>
                <span
                  className="badge"
                  style={{ background: STATUS_COLORS[proto.status] }}
                >
                  {proto.status}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                Week {proto.current_week} · {proto.current_dose} {unit}
                {proto.frequency ? ` · ${proto.frequency}` : ""}
                {proto.route ? ` · ${proto.route}` : ""}
                {proto.goal ? ` · ${proto.goal}` : ""}
              </p>

              <HrtAdministrationLogger
                protocolId={proto.id}
                patientId={patientId}
                route={proto.route}
                doseUnit={unit}
              />

              {admins.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Dose</th>
                        <th style={thStyle}>Site</th>
                        <th style={thStyle}>Side effects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((a) => (
                        <tr key={a.id}>
                          <td style={tdStyle}>{a.created_at.slice(0, 10)}</td>
                          <td style={tdStyle}>
                            {a.dose} {a.dose_unit ?? unit}
                          </td>
                          <td style={tdStyle}>{a.injection_site ?? "—"}</td>
                          <td style={tdStyle}>
                            {a.side_effects && a.side_effects.length
                              ? a.side_effects.join(", ")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  borderBottom: "1.5px solid var(--line)",
  padding: "6px 8px",
  color: "var(--muted)",
} as const;
const tdStyle = {
  borderBottom: "1px solid var(--line)",
  padding: "6px 8px",
} as const;
