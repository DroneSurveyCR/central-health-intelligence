"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observability/logger";

export default function PatientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureError(error, { boundary: "patient", digest: error.digest });
  }, [error]);

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1 className="serif" style={{ fontSize: 24, margin: "0 0 8px" }}>
        Something went wrong
      </h1>
      <p className="muted" style={{ margin: "0 0 18px" }}>
        We couldn&apos;t load this page. Please try again.
      </p>
      <button type="button" className="btn" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
