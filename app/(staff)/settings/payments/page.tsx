import { getCurrentPractice } from "@/lib/billing/practice";
import { connectEnabled } from "@/lib/billing/connect";
import DisconnectButton from "./DisconnectButton";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const practice = await getCurrentPractice();
  const isAdmin = practice?.role === "admin" || practice?.role === "doctor";
  const acct = practice?.stripe_connect_account_id ?? null;
  const connected = practice?.stripe_connect_status === "connected" && Boolean(acct);
  const enabled = connectEnabled();

  return (
    <div style={{ maxWidth: 760, padding: "8px 4px" }}>
      <h1 className="serif" style={{ fontSize: 26, marginBottom: 4 }}>Client Payments</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Connect your clinic’s own Stripe account so patient card payments land directly in <em>your</em> account.
        Central Health Intelligence never holds these funds — this is separate from your Central Health Intelligence subscription.
      </p>

      {connected ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span className="badge">Connected</span>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Account {acct}</div>
            </div>
            {isAdmin && <DisconnectButton />}
          </div>
        </div>
      ) : !enabled ? (
        <div className="card" style={{ marginTop: 12, fontSize: 14 }}>
          Stripe Connect isn’t switched on for the platform yet. Once the platform’s Connect app id
          (<code>STRIPE_CONNECT_CLIENT_ID</code>) is configured, clinics can connect their Stripe here.
        </div>
      ) : isAdmin ? (
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/api/connect/authorize">Connect Stripe</a>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            You’ll be sent to Stripe to authorize your existing account, then returned here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12, fontSize: 14 }}>Ask a practice admin to connect Stripe.</div>
      )}
    </div>
  );
}
