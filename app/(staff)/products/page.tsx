import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import ProductEditor from "./ProductEditor";

type ProductRow = {
  id: string;
  name: string;
  type: string | null;
  price: number | null;
};

const money = (n: number) => `$${n.toFixed(2)}`;

export default async function ProductsPage() {
  // Admin-only — patients and assistants don't manage the catalog.
  await requireStaff(["doctor", "admin"]);

  const supabase = await createClient();
  const { data: productRows } = (await supabase
    .from("products")
    .select("id, name, type, price")
    .order("type")
    .order("name")) as { data: ProductRow[] | null };

  const products = productRows ?? [];

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Products
      </h1>
      <p className="muted">
        The supplement catalog patients see in the Store.
      </p>

      <section style={{ marginTop: 22 }}>
        <h2 className="serif" style={{ fontSize: 19 }}>
          Catalog
        </h2>
        {products.length === 0 ? (
          <p className="muted">No products yet — add your first one below.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {products.map((p) => (
              <li key={p.id} style={rowStyle}>
                <span>
                  <b>{p.name}</b>{" "}
                  <span className="muted">{p.type ?? "supplement"}</span>
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
          Add a product
        </h2>
        <ProductEditor />
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
