import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import SupplementEditor from "./SupplementEditor";

type ProductRow = {
  id: string;
  name: string;
  type: string | null;
  price: number | null;
  fullscript_ref: string | null;
};

const money = (n: number) => `$${n.toFixed(2)}`;

export default async function DispensaryPage() {
  await requireStaff();
  await requireModule("dispensary");

  const supabase = await createClient();
  // RLS scopes products to the caller's practice.
  const { data: productRows } = (await supabase
    .from("products")
    .select("id, name, type, price, fullscript_ref")
    .eq("type", "supplement")
    .order("name")) as { data: ProductRow[] | null };

  const products = productRows ?? [];

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Dispensary
      </h1>
      <p className="muted">
        Your clinic&apos;s supplement catalog. Recommend items to patients from
        their record.
      </p>

      <section style={{ marginTop: 22 }}>
        <h2 className="serif" style={{ fontSize: 19 }}>
          Supplement catalog
        </h2>
        {products.length === 0 ? (
          <p className="muted">
            No supplements yet — add your first one below.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {products.map((p) => (
              <li key={p.id} style={rowStyle}>
                <span>
                  <b>{p.name}</b>{" "}
                  {p.fullscript_ref && (
                    <span className="muted">· {p.fullscript_ref}</span>
                  )}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {p.price == null ? "—" : money(Number(p.price))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="serif" style={{ fontSize: 19 }}>
          Add a supplement
        </h2>
        <SupplementEditor />
      </section>

      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        To recommend supplements, open a patient&apos;s record and visit their{" "}
        <Link href="/patients">Dispensary tab</Link>.
      </p>
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
