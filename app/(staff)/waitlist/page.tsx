import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import WaitlistRow from "./WaitlistRow";

type Status = "waiting" | "offered" | "booked" | "removed";

const STATUS_LABEL: Record<Status, string> = {
  waiting: "Waiting", offered: "Offered", booked: "Booked", removed: "Removed",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  await requireStaff();
  const { all } = await searchParams;
  const showRemoved = all === "1";
  const supabase = await createClient();

  let query = supabase
    .from("waitlist_entries")
    .select("id, status, notes, priority, requested_at, patients(first_name, last_name)")
    .order("priority", { ascending: true })
    .order("requested_at", { ascending: true });

  if (!showRemoved) query = query.neq("status", "removed");

  const { data } = await query;
  const rows = data ?? [];

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Waitlist</h1>
        <Link className="btn ghost" href={showRemoved ? "/waitlist" : "/waitlist?all=1"} style={{ fontSize: 13 }}>
          {showRemoved ? "Hide removed" : "Show removed"}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            No one on the waitlist. Add a patient from their record.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 18, display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const pt = r.patients as { first_name?: string; last_name?: string } | null;
            const status = r.status as Status;
            return (
              <li key={r.id as string} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 16 }}>
                    {`${pt?.first_name ?? ""} ${pt?.last_name ?? ""}`.trim() || "Unknown patient"}
                    <span className={`badge ${status === "waiting" ? "new" : "existing"}`} style={{ marginLeft: 8, fontSize: 11 }}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  {r.notes ? <div className="muted" style={{ fontSize: 13 }}>{r.notes as string}</div> : null}
                </div>
                <WaitlistRow id={r.id as string} status={status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
