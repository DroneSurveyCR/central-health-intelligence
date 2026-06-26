import MfaChallenge from "./MfaChallenge";

export default function MfaPage() {
  return (
    <main className="auth-shell">
      <div className="auth-brand">
        <div className="mark">H</div>
        <b>HealthSync</b>
      </div>
      <MfaChallenge />
    </main>
  );
}
