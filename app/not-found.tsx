import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 26, margin: "0 0 8px" }}>
          Page not found
        </h1>
        <p className="muted" style={{ margin: "0 0 18px" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link className="btn" href="/" style={{ textDecoration: "none", display: "inline-block" }}>
          Go home
        </Link>
      </div>
    </div>
  );
}
