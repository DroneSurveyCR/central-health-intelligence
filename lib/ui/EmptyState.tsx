import Link from "next/link";

// Calm, centered empty state with an optional call-to-action.
export default function EmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card" style={{ marginTop: 18, maxWidth: "none", textAlign: "center", padding: "34px 24px" }}>
      <p className="serif" style={{ fontSize: 19, margin: "0 0 6px" }}>{title}</p>
      <p className="muted" style={{ margin: "0 auto", maxWidth: 380 }}>{message}</p>
      {cta && (
        <p style={{ margin: "16px 0 0" }}>
          <Link href={cta.href} className="btn" style={{ display: "inline-block", textDecoration: "none" }}>
            {cta.label}
          </Link>
        </p>
      )}
    </div>
  );
}
