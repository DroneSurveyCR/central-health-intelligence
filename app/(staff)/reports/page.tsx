import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { REPORTS } from "@/lib/reports/queries";

export default async function ReportsHub() {
  await requireStaff();
  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Reports</h1>
      <p className="muted">Finance reports. Each is filterable by date and exportable to CSV.</p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 18, display: "grid", gap: 10 }}>
        {REPORTS.map((r) => (
          <li key={r.key}>
            <Link href={`/reports/${r.key}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              <div className="serif" style={{ fontSize: 17 }}>{r.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>{r.desc}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
