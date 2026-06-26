import { requireStaff } from "@/lib/auth/roles";
import MfaEnroll from "./MfaEnroll";

export default async function SecurityPage() {
  await requireStaff();
  return (
    <div style={{ maxWidth: 520 }}>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        Security
      </h1>
      <p className="muted">Protect your account with two-factor authentication.</p>
      <div style={{ marginTop: 18 }}>
        <MfaEnroll />
      </div>
    </div>
  );
}
