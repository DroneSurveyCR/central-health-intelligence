import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { completeTask } from "../tasks/actions";
import { AddTaskForm, CareTeamAssign, type Option } from "./DeskClient";

type Named = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;

function one(p: Named): { first_name: string; last_name: string } | null {
  return Array.isArray(p) ? (p[0] ?? null) : p;
}
function pname(p: Named): string {
  const x = one(p);
  return x ? `${x.first_name} ${x.last_name}`.trim() : "Unknown";
}
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
function money(total: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(total);
  } catch {
    return `${total} ${currency}`;
  }
}

// Check-in state for an appointment status.
const CHECKED_IN = new Set(["arrived", "in_session"]);
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  arrived: "Checked in",
  in_session: "In session",
  done: "Done",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export default async function DeskPage() {
  await requireStaff();
  const supabase = await createClient();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);
  const todayISODate = dayStart.toISOString().slice(0, 10);

  // Run the independent reads in parallel.
  const [apptRes, intakeRes, invoiceRes, taskRes, pracRes, patRes] =
    await Promise.all([
      // Today's schedule (practice-wide, not just me) with check-in status.
      supabase
        .from("appointments")
        .select(
          "id, start_time, type, status, patient_id, patients(first_name, last_name)",
        )
        .gte("start_time", dayStart.toISOString())
        .lt("start_time", dayEnd.toISOString())
        .neq("status", "cancelled")
        .order("start_time"),
      // Incomplete intake forms (patient hasn't finished onboarding).
      supabase
        .from("intake_forms")
        .select("patient_id, completed, updated_at, patients(first_name, last_name)")
        .eq("completed", false)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(25),
      // Unpaid / overdue invoices (anything issued but not yet paid).
      supabase
        .from("invoices")
        .select("id, number, status, total, currency, due_on, patient_id, patients(first_name, last_name)")
        .in("status", ["sent", "draft"])
        .order("due_on", { ascending: true })
        .limit(25),
      // Open tasks worklist.
      supabase
        .from("tasks")
        .select(
          "id, title, detail, status, due_at, patient_id, assignee_id, patients(first_name, last_name)",
        )
        .eq("status", "open")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(50),
      // Staff for assignee / care-team dropdowns.
      supabase
        .from("practitioners")
        .select("id, name, role, active")
        .eq("active", true)
        .order("name"),
      // Patients for task / care-team association.
      supabase
        .from("patients")
        .select("id, first_name, last_name")
        .is("deleted_at", null)
        .order("last_name")
        .limit(500),
    ]);

  await logAudit({ action: "view", resource: "desk" });

  const appts = (apptRes.data ?? []) as Array<{
    id: string;
    start_time: string;
    type: string | null;
    status: string;
    patient_id: string;
    patients: Named;
  }>;
  const intakes = (intakeRes.data ?? []) as Array<{
    patient_id: string;
    patients: Named;
  }>;
  const invoices = (invoiceRes.data ?? []) as Array<{
    id: string;
    number: string | null;
    status: string;
    total: number;
    currency: string;
    due_on: string | null;
    patient_id: string;
    patients: Named;
  }>;
  const tasks = (taskRes.data ?? []) as Array<{
    id: string;
    title: string;
    detail: string | null;
    due_at: string | null;
    patient_id: string | null;
    patients: Named;
  }>;

  const practitioners: Option[] = ((pracRes.data ?? []) as Array<{
    id: string;
    name: string | null;
    role: string | null;
  }>).map((p) => ({
    id: p.id,
    label: `${p.name ?? "Staff"}${p.role ? ` · ${p.role}` : ""}`,
  }));
  const patients: Option[] = ((patRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>).map((p) => ({ id: p.id, label: `${p.first_name} ${p.last_name}`.trim() }));

  const checkedIn = appts.filter((a) => CHECKED_IN.has(a.status)).length;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          Front desk
        </h1>
        <span className="muted" style={{ fontSize: 13 }}>
          {appts.length} appointment{appts.length === 1 ? "" : "s"} today ·{" "}
          {checkedIn} checked in
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          marginTop: 16,
          alignItems: "start",
        }}
      >
        {/* Today's schedule */}
        <section className="card">
          <h2 className="serif" style={{ fontSize: 17, margin: "0 0 10px" }}>
            Today&apos;s schedule
          </h2>
          {appts.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              No appointments today.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {appts.map((a) => {
                const ci = CHECKED_IN.has(a.status);
                return (
                  <li
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <Link
                      href={`/patients/${a.patient_id}`}
                      style={{ textDecoration: "none", color: "var(--ink)", fontSize: 14 }}
                    >
                      <b>{fmtTime(a.start_time)}</b> · {pname(a.patients)}
                    </Link>
                    <span
                      className={`badge ${ci ? "existing" : a.status === "no_show" ? "new" : ""}`}
                      style={{ fontSize: 11 }}
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Incomplete intake */}
        <section className="card">
          <h2 className="serif" style={{ fontSize: 17, margin: "0 0 10px" }}>
            Incomplete intake
          </h2>
          {intakes.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Everyone&apos;s intake is complete.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {intakes.map((i) => (
                <li key={i.patient_id} style={{ fontSize: 14 }}>
                  <Link
                    href={`/patients/${i.patient_id}`}
                    style={{ textDecoration: "none", color: "var(--ink)" }}
                  >
                    {pname(i.patients)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Unpaid / overdue invoices */}
        <section className="card">
          <h2 className="serif" style={{ fontSize: 17, margin: "0 0 10px" }}>
            Payments due
          </h2>
          {invoices.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              No outstanding invoices.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {invoices.map((inv) => {
                const overdue = !!inv.due_on && inv.due_on < todayISODate;
                return (
                  <li
                    key={inv.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 14,
                    }}
                  >
                    <Link
                      href={`/invoices/${inv.patient_id}`}
                      style={{ textDecoration: "none", color: "var(--ink)" }}
                    >
                      {pname(inv.patients)}
                      <span className="muted" style={{ fontSize: 12 }}>
                        {" "}
                        · {money(inv.total, inv.currency)}
                      </span>
                    </Link>
                    <span
                      className={`badge ${overdue ? "new" : ""}`}
                      style={{ fontSize: 11 }}
                    >
                      {overdue ? "Overdue" : inv.status === "draft" ? "Draft" : "Unpaid"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Open tasks */}
        <section className="card">
          <h2 className="serif" style={{ fontSize: 17, margin: "0 0 10px" }}>
            Open tasks
          </h2>
          {tasks.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Nothing on the worklist.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {tasks.map((t) => (
                <li
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 14 }}>
                    <div>{t.title}</div>
                    {(t.detail || t.patient_id || t.due_at) && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {t.patient_id ? pname(t.patients) : ""}
                        {t.patient_id && t.due_at ? " · " : ""}
                        {t.due_at ? `due ${new Date(t.due_at).toLocaleDateString()}` : ""}
                        {t.detail ? (t.patient_id || t.due_at ? " · " : "") + t.detail : ""}
                      </div>
                    )}
                  </div>
                  <form action={completeTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="btn ghost" type="submit" style={{ fontSize: 12 }}>
                      Done
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <AddTaskForm practitioners={practitioners} patients={patients} />
          </div>
        </section>
      </div>

      {/* Care team assignment */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="serif" style={{ fontSize: 17, margin: "0 0 10px" }}>
          Care team
        </h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Put a practitioner on a patient&apos;s care team and set whether they
          may approve clinical AI drafts.
        </p>
        <CareTeamAssign practitioners={practitioners} patients={patients} />
      </div>
    </div>
  );
}
