import LoginTabs from "./LoginTabs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="auth-shell">
      <div className="auth-brand">
        <div className="mark">P</div>
        <b>Personal Health Intelligence</b>
      </div>
      <h1 className="auth-title">Welcome</h1>
      <p className="auth-sub">Your practice, on one platform.</p>
      <LoginTabs
        sent={sp.sent}
        error={sp.error}
        initialTab={sp.tab === "staff" ? "staff" : "patient"}
      />
      <p className="auth-sub" style={{ marginTop: 22, fontSize: 12.5, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <a href="/legal/privacy">Privacy</a>
        <a href="/legal/terms">Terms</a>
        <a href="/legal/notice">HIPAA Notice</a>
      </p>
    </main>
  );
}
