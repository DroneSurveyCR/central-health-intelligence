"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily:
            '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
          background: "#fffbf4",
          color: "#1e3a30",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            background: "#fff",
            border: "1px solid #ece1ce",
            borderRadius: 18,
            boxShadow: "0 24px 60px -24px rgba(30, 58, 48, 0.25)",
            padding: 22,
          }}
        >
          <h1
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 26,
              margin: "0 0 8px",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#7b8a7e", margin: "0 0 18px" }}>
            A critical error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              background: "#14834e",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              padding: 13,
              borderRadius: 12,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
