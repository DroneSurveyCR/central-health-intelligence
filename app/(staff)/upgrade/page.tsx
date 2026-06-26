import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  await requireStaff();
  const { module } = await searchParams;
  const name = module ?? "this";

  return (
    <div style={{ maxWidth: 540, margin: "48px auto" }}>
      <div className="card" style={{ padding: "28px 32px" }}>
        <h1 className="serif" style={{ fontSize: 26, margin: "0 0 12px" }}>
          Module not enabled
        </h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 24px" }}>
          The {name} module isn&apos;t enabled for your practice. Contact your
          administrator to add it.
        </p>
        <Link className="btn" href="/focus" style={{ textDecoration: "none" }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
