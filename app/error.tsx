"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="auth-shell">
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 26, margin: "0 0 8px" }}>
          Something went wrong
        </h1>
        <p className="muted" style={{ margin: "0 0 18px" }}>
          An unexpected error occurred. You can try again.
        </p>
        <button type="button" className="btn" onClick={() => reset()} style={{ width: "100%" }}>
          Try again
        </button>
      </div>
    </div>
  );
}
