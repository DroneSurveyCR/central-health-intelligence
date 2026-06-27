import { getCurrentPractice, countProviderSeats } from "@/lib/billing/practice";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { stripeEnabled } from "@/lib/stripe";
import { getEnabledModules } from "@/lib/modules/requireModule";
import PlanPicker from "./PlanPicker";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const practice = await getCurrentPractice();
  const mods = await getEnabledModules();
  const isAdmin = practice?.role === "admin" || practice?.role === "doctor";
  const current = (practice?.plan ?? "starter") as PlanId;
  const seats = practice ? await countProviderSeats(practice.id) : 1;
  const hasCustomer = Boolean(practice?.stripe_customer_id);
  const setupPaid = Boolean(practice?.setup_fee_paid_at);

  return (
    <div style={{ maxWidth: 880, padding: "8px 4px" }}>
      <h1 className="serif" style={{ fontSize: 26, marginBottom: 4 }}>Plan &amp; Billing</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Current plan: <strong>{PLANS[current]?.label ?? current}</strong> · {mods.size} modules active ·{" "}
        {seats} {seats === 1 ? "provider" : "providers"}
      </p>

      {!stripeEnabled && (
        <div className="card" style={{ marginTop: 12, fontSize: 14 }}>
          Card billing isn’t switched on yet (no Stripe keys configured). Plans are shown for reference; once
          keys + price IDs are set, the buttons below open Stripe Checkout and a successful payment flips this
          practice’s plan and unlocks its modules automatically.
        </div>
      )}

      <PlanPicker
        current={current}
        canManage={Boolean(isAdmin && stripeEnabled)}
        seats={seats}
        hasCustomer={hasCustomer}
        setupPaid={setupPaid}
      />
    </div>
  );
}
