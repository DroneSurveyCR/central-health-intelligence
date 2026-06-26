import { buildSnapshot, type Snapshot } from "@/lib/snapshot/build";
import { createClient } from "@/lib/supabase/server";

type Props = { data: Snapshot } | { patientId: string };

const DASH = "—";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--berry)",
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        background: "var(--sand)",
        border: "1px solid var(--line)",
        color: "var(--ink)",
        fontSize: 12.5,
        fontWeight: 600,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Patient Snapshot — a compact, on-brand clinical summary card.
 * Server component. Pass either a prebuilt `data` Snapshot, or just a
 * `patientId` (it will fetch + build itself). Trivially embeddable:
 *   <Snapshot patientId={patient.id} />
 */
export default async function Snapshot(props: Props) {
  let data: Snapshot | null;
  if ("data" in props) {
    data = props.data;
  } else {
    const supabase = await createClient();
    data = await buildSnapshot(supabase, props.patientId);
  }

  if (!data) {
    return (
      <div className="card" style={{ maxWidth: "none" }}>
        <p className="muted" style={{ margin: 0 }}>
          No snapshot available for this patient.
        </p>
      </div>
    );
  }

  const meta = [
    data.age != null ? `Age ${data.age}` : null,
    data.sex ? data.sex[0].toUpperCase() + data.sex.slice(1) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 className="serif" style={{ fontSize: 22, margin: 0 }}>
          Snapshot
        </h2>
        {meta && (
          <span className="muted" style={{ fontSize: 13 }}>
            {meta}
          </span>
        )}
      </div>

      {/* Goals */}
      <Section title="Goals">
        {data.goals.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {DASH}
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.goals.map((g, i) => (
              <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                {g}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Flags */}
      {data.flags.length > 0 && (
        <Section title="Flags">
          <div>
            {data.flags.map((f, i) => (
              <Pill key={i}>{f}</Pill>
            ))}
          </div>
        </Section>
      )}

      {/* Active Plan */}
      <Section title="Active Plan">
        {!data.activePlan ? (
          <p className="muted" style={{ margin: 0 }}>
            {DASH}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            <b>{data.activePlan.title}</b>
            {data.activePlan.currentPhaseName ? (
              <>
                {" · "}
                {data.activePlan.currentPhaseName}
              </>
            ) : null}
            {data.activePlan.daysRemaining != null ? (
              <span className="muted">
                {" · "}
                {data.activePlan.daysRemaining} day
                {data.activePlan.daysRemaining === 1 ? "" : "s"} left
              </span>
            ) : null}
          </p>
        )}
      </Section>

      {/* Latest Scan */}
      <Section title="Latest Scan">
        {!data.latestScan ? (
          <p className="muted" style={{ margin: 0 }}>
            {DASH}
          </p>
        ) : (
          <div>
            <p className="muted" style={{ margin: "0 0 6px", fontSize: 13 }}>
              {fmtDate(data.latestScan.date)}
            </p>
            {data.latestScan.topSystems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {DASH}
              </p>
            ) : (
              <div>
                {data.latestScan.topSystems.map((s, i) => (
                  <Pill key={i}>{s}</Pill>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Trend */}
      <Section title="Trend">
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          <span className="muted">Feeling (7d avg): </span>
          {data.trend.avgFeel7d != null ? <b>{data.trend.avgFeel7d}/10</b> : DASH}
          {"   "}
          <span style={{ display: "inline-block", width: 14 }} />
          <span className="muted">Latest BP: </span>
          {data.trend.latestVital ? <b>{data.trend.latestVital}</b> : DASH}
        </p>
      </Section>
    </div>
  );
}
