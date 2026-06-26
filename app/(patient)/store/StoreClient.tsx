"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/components/Toast";

export type StoreProduct = {
  id: string;
  name: string;
  type: string;
  price: number | null;
};

type CartLine = {
  product: StoreProduct;
  qty: number;
};

type Props = {
  products: StoreProduct[];
};

const money = (n: number) => `$${n.toFixed(2)}`;

const chip = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: "capitalize",
  background: bg,
  color: fg,
});

export default function StoreClient({ products }: Props) {
  const router = useRouter();
  const t = useT();
  const toast = useToast();

  // Cart: array of { product, qty }.
  const [cart, setCart] = useState<CartLine[]>([]);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  // Synchronous guard against a fast double-tap submitting two orders before
  // the `placing` state has had a chance to flip and disable the button.
  const submittingRef = useRef(false);

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, line) => sum + (line.product.price ?? 0) * line.qty, 0),
    [cart],
  );

  function add(product: StoreProduct) {
    setConfirmed(false);
    setError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: Math.min(l.qty + 1, 99) } : l,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function setQty(productId: string, qty: number) {
    setConfirmed(false);
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    );
  }

  async function placeOrder() {
    if (cart.length === 0 || placing) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({ product_id: l.product.id, qty: l.qty })),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        const message = j.error || t("store_order_error");
        setError(message);
        toast.error(message);
        return;
      }
      setCart([]);
      setConfirmed(true);
      toast.success("Order placed");
      router.refresh();
    } catch {
      setError(t("store_order_error"));
      toast.error(t("store_order_error"));
    } finally {
      setPlacing(false);
      submittingRef.current = false;
    }
  }

  return (
    <div
      style={{
        marginTop: 22,
        display: "flex",
        flexWrap: "wrap",
        gap: 22,
        alignItems: "flex-start",
      }}
    >
      {/* Product grid */}
      <div
        style={{
          flex: "1 1 320px",
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ flex: 1 }}>
              <span style={chip("rgba(20,131,78,0.12)", "var(--berry)")}>
                {p.type}
              </span>
              <h3 style={{ fontSize: 16, margin: "10px 0 0", lineHeight: 1.3 }}>
                {p.name}
              </h3>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                {p.price == null ? "—" : money(p.price)}
              </span>
              <button
                type="button"
                className="btn ghost"
                onClick={() => add(p)}
                style={{ padding: "7px 14px", fontSize: 13 }}
              >
                {t("store_add")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart summary */}
      <div
        className="card"
        style={{
          flex: "1 1 280px",
          maxWidth: 340,
          position: "sticky",
          top: 16,
          borderColor: "var(--berry)",
        }}
      >
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 4px" }}>
          {t("store_your_order")}
        </h2>

        {cart.length === 0 ? (
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            {confirmed ? t("store_order_placed") : t("store_cart_empty")}
          </p>
        ) : (
          <>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {cart.map((line) => (
                <li
                  key={line.product.id}
                  style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {line.product.name}
                    </span>
                    <span style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                      {money((line.product.price ?? 0) * line.qty)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <Stepper
                      label="−"
                      onClick={() => setQty(line.product.id, line.qty - 1)}
                    />
                    <span style={{ minWidth: 22, textAlign: "center", fontWeight: 600 }}>
                      {line.qty}
                    </span>
                    <Stepper
                      label="+"
                      onClick={() => setQty(line.product.id, Math.min(line.qty + 1, 99))}
                    />
                    <button
                      type="button"
                      onClick={() => setQty(line.product.id, 0)}
                      className="muted"
                      style={{
                        marginLeft: "auto",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        textDecoration: "underline",
                      }}
                    >
                      {t("store_remove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                fontWeight: 700,
              }}
            >
              <span>{t("store_subtotal")}</span>
              <span>{money(subtotal)}</span>
            </div>
          </>
        )}

        {error && (
          <p style={{ margin: "10px 0 0", color: "#b4231f", fontSize: 13 }}>{error}</p>
        )}

        <button
          type="button"
          className="btn"
          onClick={placeOrder}
          disabled={cart.length === 0 || placing}
          style={{
            marginTop: 14,
            width: "100%",
            opacity: cart.length === 0 || placing ? 0.6 : 1,
          }}
        >
          {placing ? t("store_placing") : t("store_place_order")}
        </button>
      </div>
    </div>
  );
}

function Stepper({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "#fff",
        cursor: "pointer",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        color: "var(--ink, #1e3a30)",
      }}
    >
      {label}
    </button>
  );
}
