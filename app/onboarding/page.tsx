import OnboardingForm from "./OnboardingForm";

// Public signup — no auth guard. Creates a brand-new tenant.
export default function OnboardingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--paper)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: 28 }}>
        <h1 className="serif" style={{ marginTop: 0, marginBottom: 6 }}>
          Start your Personal Health Intelligence practice
        </h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 22, fontSize: 14 }}>
          Create your workspace in a few seconds.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
