import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { recommendSupplement } from "./actions";

type ProductRow = {
  id: string;
  name: string;
  price: number | null;
};

type RecRow = {
  id: string;
  product_name: string;
  dosage_note: string | null;
  created_at: string;
};

const money = (n: number) => `$${n.toFixed(2)}`;

export default async function PatientDispensaryPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("dispensary");
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
  await logAudit({
    action: "view",
    resource: "supplement_recommendations",
    patientId,
  });

  const [{ data: catalog }, { data: recs }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, price")
      .eq("type", "supplement")
      .order("name") as unknown as Promise<{ data: ProductRow[] | null }>,
    supabase
      .from("supplement_recommendations")
      .select("id, product_name, dosage_note, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(100) as unknown as Promise<{ data: RecRow[] | null }>,
  ]);

  const products = catalog ?? [];
  const recommendations = recs ?? [];

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
      <p className="muted">Supplement recommendations</p>

      {/* Recommend a supplement */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Recommend a supplement
        </h2>
        {products.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No supplements in the catalog yet —{" "}
            <Link href="/dispensary">add some to the dispensary</Link> first.
          </p>
        ) : (
          <form
            action={recommendSupplement}
            className="form"
            style={{ display: "grid", gap: 10 }}
          >
            <input type="hidden" name="patientId" value={patientId} />
            <label style={labelStyle}>
              Supplement
              <select name="product_id" required style={fieldStyle} defaultValue="">
                <option value="" disabled>
                  Choose from catalog…
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.price == null ? "" : ` — ${money(Number(p.price))}`}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Dosage note
              <input
                name="dosage_note"
                placeholder="e.g. 1 capsule with breakfast"
                style={fieldStyle}
              />
            </label>
            <button className="btn" type="submit" style={{ justifySelf: "start" }}>
              Add recommendation
            </button>
          </form>
        )}
      </section>

      {/* Prior recommendations */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Prior recommendations
        </h2>
        {recommendations.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No recommendations yet.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recommendations.map((r) => (
              <li key={r.id} style={rowStyle}>
                <span>
                  <b>{r.product_name}</b>{" "}
                  {r.dosage_note && (
                    <span className="muted">· {r.dosage_note}</span>
                  )}
                </span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {r.created_at.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
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

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
} as const;
const fieldStyle = {
  padding: "10px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
} as const;
