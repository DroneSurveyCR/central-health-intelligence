import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import ChiroAssistant from "./ChiroAssistant";

export default async function ChiroAssistantPage() {
  await requireStaff();
  await requireModule("chiro");

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Chiro assistant</h1>
        <Link className="btn ghost" href="/focus" style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}>
          Back
        </Link>
      </div>
      <p className="muted">
        Grounded in the chiropractic knowledge base and your clinic&apos;s own content. Chiro &amp; spine/MSK
        topics only — it declines anything else, and never diagnoses.
      </p>
      <ChiroAssistant />
    </div>
  );
}
