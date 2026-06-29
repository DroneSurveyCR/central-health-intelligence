import Link from "next/link";

export const metadata = { title: "Legal — Health Intelligency / Central Health Intelligence" };

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header style={{ borderBottom: "1px solid var(--line)", padding: "16px 20px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/" className="serif" style={{ fontSize: 18, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
            Health Intelligency
          </Link>
          <nav style={{ display: "flex", gap: 18, fontSize: 14 }}>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/notice">HIPAA Notice</Link>
          </nav>
        </div>
      </header>
      <main className="legal" style={{ maxWidth: 760, margin: "0 auto", padding: "30px 20px 64px", lineHeight: 1.65 }}>
        {children}
      </main>
    </div>
  );
}
