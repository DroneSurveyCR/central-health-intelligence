import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline · Central Health Intelligence",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 24px",
        background: "#fff6ea",
        color: "#14834e",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 20px",
            borderRadius: 16,
            background: "#14834e",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 700,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          H
        </div>
        <h1 style={{ fontSize: 28, margin: "0 0 8px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
          You&apos;re offline
        </h1>
        <p style={{ color: "#4a5a52", lineHeight: 1.5, margin: "0 0 24px" }}>
          Central Health Intelligence can&apos;t reach the internet right now. Check your
          connection and try again — your data is safe.
        </p>
        <Link
          href="/home"
          style={{
            display: "inline-block",
            textDecoration: "none",
            background: "#14834e",
            color: "#fff",
            padding: "12px 22px",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
