import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import EmptyState from "@/lib/ui/EmptyState";

const STATUS_KEY: Record<string, string> = {
  pending: "order_status_pending",
  paid: "order_status_paid",
  fulfilled: "order_status_fulfilled",
  completed: "order_status_completed",
  cancelled: "order_status_cancelled",
};

type OrderItem = {
  product_id?: string;
  name?: string;
  price?: number;
  qty?: number;
};

type OrderRow = {
  id: string;
  status: string | null;
  total: number | null;
  items_json: OrderItem[] | null;
  placed_at: string | null;
  created_at: string | null;
};

const money = (n: number) => `$${n.toFixed(2)}`;

function statusClass(status: string): string {
  // Reuse existing badge variants where they make sense.
  if (status === "fulfilled" || status === "completed" || status === "paid")
    return "badge existing";
  return "badge new";
}

export default async function OrdersPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();

  // RLS limits this to the patient's own orders.
  const { data: orderRows } = (await supabase
    .from("orders")
    .select("id, status, total, items_json, placed_at, created_at")
    .order("placed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })) as { data: OrderRow[] | null };

  const orders = orderRows ?? [];

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {t("orders_title", lang)}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        {t("orders_subtitle", lang)}
      </p>

      {orders.length === 0 ? (
        <EmptyState
          title={t("orders_empty_title", lang)}
          message={t("orders_empty", lang)}
          cta={{ href: "/store", label: t("orders_browse_store", lang) }}
        />
      ) : (
        <div style={{ marginTop: 18 }}>
          {orders.map((o) => {
            const items = Array.isArray(o.items_json) ? o.items_json : [];
            const itemCount = items.reduce(
              (n, it) => n + (Number(it.qty) || 0),
              0,
            );
            const when = o.placed_at ?? o.created_at;
            const status = o.status ?? "pending";
            return (
              <div key={o.id} className="card" style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {when
                        ? new Date(when).toLocaleDateString(
                            lang === "es" ? "es-CR" : "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : t("orders_date_pending", lang)}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {itemCount}{" "}
                      {itemCount === 1 ? t("orders_item", lang) : t("orders_items", lang)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={statusClass(status)}>
                      {t(STATUS_KEY[status] ?? "order_status_pending", lang)}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      {money(Number(o.total ?? 0))}
                    </span>
                  </div>
                </div>

                {items.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
                    {items.map((it, i) => (
                      <li
                        key={`${o.id}-${i}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "4px 0",
                          fontSize: 14,
                        }}
                      >
                        <span>
                          {it.name ?? t("orders_item_fallback", lang)}
                          {it.qty && it.qty > 1 ? (
                            <span className="muted"> × {it.qty}</span>
                          ) : null}
                        </span>
                        <span className="muted" style={{ whiteSpace: "nowrap" }}>
                          {money((Number(it.price) || 0) * (Number(it.qty) || 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
