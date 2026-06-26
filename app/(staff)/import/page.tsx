import { requireStaff } from "@/lib/auth/roles";
import ImportWizard from "./ImportWizard";

export default async function ImportPage() {
  await requireStaff(["doctor", "admin"]);

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Import patients
      </h1>
      <p className="muted">
        Migrating from another system? Paste (or upload) a CSV of your existing
        patients to bring them in. Each row becomes a new patient record.
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="serif" style={{ fontSize: 17, margin: "0 0 6px" }}>
          Expected CSV columns
        </h2>
        <p className="muted" style={{ margin: "0 0 8px" }}>
          The first row must be a header. These columns are read (others are
          ignored):
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
          <li>
            <code>first_name</code> <span className="muted">— required</span>
          </li>
          <li>
            <code>last_name</code> <span className="muted">— required</span>
          </li>
          <li>
            <code>email</code>{" "}
            <span className="muted">— required, must be a valid address (used to skip duplicates)</span>
          </li>
          <li>
            <code>sex</code>{" "}
            <span className="muted">— optional: male, female, other, or undisclosed</span>
          </li>
          <li>
            <code>dob</code>{" "}
            <span className="muted">— optional date of birth (YYYY-MM-DD)</span>
          </li>
        </ul>
        <p className="hint" style={{ marginTop: 10 }}>
          Example:{" "}
          <code>first_name,last_name,email,sex,dob</code> then{" "}
          <code>Jane,Doe,jane@example.com,female,1986-04-02</code>
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <ImportWizard />
      </div>
    </div>
  );
}
