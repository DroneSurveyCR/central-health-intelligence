import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { AGREEMENT_TEMPLATES } from "@/lib/agreements/templates";

export default async function StaffAgreementsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient)
    return <p className="muted">Client not found, or you don&apos;t have access.</p>;

  // PHI read — must be audited.
  await logAudit({
    action: "view",
    resource: "agreements",
    resourceId: patientId,
    patientId,
  });

  const { data: rows } = await supabase
    .from("agreements")
    .select("id, type, document_ref, signature_ref, signed_at")
    .eq("patient_id", patientId);

  const byType = new Map((rows ?? []).map((r) => [r.type as string, r]));

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        Agreements — {patient.first_name} {patient.last_name}
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Consent agreements and captured signatures.
      </p>

      {AGREEMENT_TEMPLATES.map((tpl) => {
        const row = byType.get(tpl.key);
        const signed = Boolean(row?.signed_at);
        return (
          <div
            key={tpl.key}
            className="card"
            style={{
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <h2 className="serif" style={{ fontSize: 18, margin: 0 }}>
                {row?.document_ref || tpl.title}
              </h2>
              {signed ? (
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Signed {new Date(row!.signed_at as string).toLocaleString()}
                </p>
              ) : (
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Not signed
                </p>
              )}
            </div>
            <div>
              {signed ? (
                <span style={{ ...pillStyle, background: "var(--berry)", color: "#fff", borderColor: "var(--berry)" }}>
                  Signed
                </span>
              ) : (
                <span style={pillStyle}>Pending</span>
              )}
            </div>
            {row?.signature_ref && typeof row.signature_ref === "string" && row.signature_ref.startsWith("data:image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.signature_ref}
                alt={`${tpl.title} signature`}
                style={{
                  width: 120,
                  height: 56,
                  objectFit: "contain",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const pillStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  whiteSpace: "nowrap",
} as const;
