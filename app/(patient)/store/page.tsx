import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import StoreClient, { type StoreProduct } from "./StoreClient";

export default async function StorePage() {
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const lang = await getServerLang();

  // Products are PUBLIC read.
  const { data: productRows } = await supabase
    .from("products")
    .select("id, name, type, price")
    .order("type")
    .order("name");

  const products: StoreProduct[] = (productRows ?? []).map((p) => ({
    id: String(p.id),
    name: String(p.name),
    type: p.type ? String(p.type) : "supplement",
    price: p.price == null ? null : Number(p.price),
  }));

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {t("store_title", lang)}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        {t("store_intro_pre", lang)}
        {me.first_name ? `, ${me.first_name}` : ""}
        {t("store_intro_post", lang)}
      </p>

      {products.length === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ margin: 0 }}>{t("store_no_products", lang)}</p>
        </div>
      ) : (
        <StoreClient products={products} />
      )}
    </div>
  );
}
