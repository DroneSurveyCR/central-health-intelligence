import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsRoster({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const supabase = await createClient();

  // RLS already scopes staff to the patients they can access.
  let query = supabase
    .from("patients")
    .select("id, first_name, last_name, email, status_cached")
    .is("deleted_at", null)
    .order("last_name");

  if (term) {
    // Match on either name part. ilike is case-insensitive; commas are safe here.
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%`,
    );
  }

  const { data: patients } = await query;
  const list = patients ?? [];

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          Patients
        </h1>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Search by name…"
            aria-label="Search patients by name"
            style={{
              padding: "7px 12px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              fontSize: 14,
              minWidth: 200,
            }}
          />
          <button className="btn ghost" type="submit" style={{ fontSize: 14 }}>
            Search
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            {term
              ? `No patients match "${term}". Try a different name.`
              : "No patients yet — they'll appear here once you have access to a record."}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 18, display: "grid", gap: 10 }}>
          {list.map((p) => (
            <li key={p.id}>
              <Link
                href={`/patients/${p.id}`}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 17 }}>
                    {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed patient"}
                  </div>
                  {p.email && (
                    <div className="muted" style={{ fontSize: 13 }}>
                      {p.email}
                    </div>
                  )}
                </div>
                {p.status_cached && (
                  <span className={`badge ${p.status_cached === "new" ? "new" : "existing"}`}>
                    {p.status_cached}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
