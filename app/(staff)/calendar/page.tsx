import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";

const START_H = 7;
const END_H = 20;
const ROW = 56; // px per hour

type Appt = {
  id: string;
  start_time: string;
  type: string | null;
  modality: string | null;
  patient_id: string;
  patients: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

function pname(a: Appt) {
  const p = Array.isArray(a.patients) ? a.patients[0] : a.patients;
  return p ? `${p.first_name} ${p.last_name?.[0] ?? ""}.` : "Patient";
}
function labelType(t: string | null) {
  return ({ consult: "Consult", follow_up: "Follow-up", scan_review: "Scan review", other: "Visit" } as Record<string, string>)[t ?? ""] ?? "Visit";
}

export default async function CalendarPage() {
  const me = await requireStaff();
  const supabase = await createClient();

  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const { data } = await supabase
    .from("appointments")
    .select("id, start_time, type, modality, patient_id, patients(first_name, last_name)")
    .eq("practitioner_id", me.id)
    .gte("start_time", monday.toISOString())
    .lt("start_time", sunday.toISOString())
    .neq("status", "cancelled")
    .order("start_time");
  await logAudit({ action: "view", resource: "calendar" });

  const appts = (data ?? []) as Appt[];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const todayKey = new Date().toDateString();

  // Appointments whose start hour falls outside the visible [START_H, END_H)
  // window would be clipped — surface a count so nothing is silently lost.
  const outOfRange = appts.filter((a) => {
    const h = new Date(a.start_time).getHours();
    return h < START_H || h >= END_H;
  }).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>Calendar</h1>
        <span className="muted" style={{ fontSize: 14 }}>
          {monday.toLocaleDateString(undefined, { month: "long", day: "numeric" })} – {new Date(sunday.getTime() - 1).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>{appts.length} appointment{appts.length === 1 ? "" : "s"} this week · one synced view.</p>
      {outOfRange > 0 && (
        <p className="muted" style={{ marginTop: 2, fontSize: 12 }}>
          +{outOfRange} appointment{outOfRange === 1 ? "" : "s"} outside 7am–8pm
        </p>
      )}

      <div className="card" style={{ marginTop: 14, padding: 0, overflow: "hidden", maxWidth: "none", width: "100%" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 820 }}>
            {/* header row */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--line)" }}>
              <div />
              {days.map((d) => {
                const isToday = d.toDateString() === todayKey;
                return (
                  <div key={d.toISOString()} style={{ padding: "10px 6px", textAlign: "center", borderLeft: "1px solid var(--line)" }}>
                    <div className="muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>{d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? "#fff" : "var(--ink)", background: isToday ? "var(--berry)" : "transparent", width: 30, height: 30, lineHeight: "30px", borderRadius: "50%", margin: "2px auto 0" }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            {/* body */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              {/* hour labels */}
              <div>
                {hours.map((h) => (
                  <div key={h} style={{ height: ROW, fontSize: 11, color: "var(--muted)", textAlign: "right", paddingRight: 6, transform: "translateY(-6px)" }}>
                    {h <= 12 ? h : h - 12}{h < 12 ? " AM" : " PM"}
                  </div>
                ))}
              </div>
              {/* day columns */}
              {days.map((d) => {
                const dayAppts = appts.filter((a) => new Date(a.start_time).toDateString() === d.toDateString());

                // Cluster appointments that share the same visual slot (same hour
                // row) so colliding blocks can be laid out side-by-side rather than
                // stacked on top of each other. Within each cluster, every appt gets
                // a column index (col) and the cluster size (cols).
                const slotGroups = new Map<number, Appt[]>();
                for (const a of dayAppts) {
                  const t = new Date(a.start_time);
                  const slot = t.getHours(); // one collision bucket per hour
                  const group = slotGroups.get(slot) ?? [];
                  group.push(a);
                  slotGroups.set(slot, group);
                }
                const layout = new Map<string, { col: number; cols: number }>();
                for (const group of slotGroups.values()) {
                  group.forEach((a, i) => layout.set(a.id, { col: i, cols: group.length }));
                }

                return (
                  <div key={d.toISOString()} style={{ position: "relative", borderLeft: "1px solid var(--line)", height: hours.length * ROW, backgroundImage: `repeating-linear-gradient(var(--line) 0 1px, transparent 1px ${ROW}px)` }}>
                    {dayAppts.map((a) => {
                      const t = new Date(a.start_time);
                      const top = (t.getHours() + t.getMinutes() / 60 - START_H) * ROW;
                      if (top < -ROW || top > hours.length * ROW) return null;
                      const { col, cols } = layout.get(a.id) ?? { col: 0, cols: 1 };
                      // Split the column width among the N colliding blocks. The 4px
                      // gutter is preserved at the column edges and between blocks.
                      const widthPct = 100 / cols;
                      const leftPct = widthPct * col;
                      return (
                        <Link
                          key={a.id}
                          href={`/patients/${a.patient_id}`}
                          style={{
                            position: "absolute", top: Math.max(0, top),
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - ${cols > 1 ? 6 : 8}px)`,
                            height: ROW - 6,
                            background: "rgba(20,131,78,.12)", border: "1px solid var(--berry)", borderLeft: "3px solid var(--berry)",
                            borderRadius: 8, padding: "4px 7px", textDecoration: "none", color: "var(--ink)", overflow: "hidden",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pname(a)}</div>
                          <div className="muted" style={{ fontSize: 10.5 }}>{t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {labelType(a.type)}</div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
