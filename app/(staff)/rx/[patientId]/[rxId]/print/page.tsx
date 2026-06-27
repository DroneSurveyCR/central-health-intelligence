import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { getPractice } from "@/lib/practice";
import { logAudit } from "@/lib/auth/audit";
import PrintButton from "./PrintButton";

type RxRow = {
  id: string;
  patient_id: string;
  prescriber_id: string;
  medication: string;
  dose: string | null;
  sig: string | null;
  quantity: string | null;
  refills: number | null;
  pharmacy_name: string | null;
  status: string;
  signed_at: string | null;
  created_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "____________________";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function RxPrintPage({
  params,
}: {
  params: Promise<{ patientId: string; rxId: string }>;
}) {
  const me = await requireStaff();
  await requireModule("rx");
  const { patientId, rxId } = await params;
  const supabase = await createClient();

  const { data: rx } = (await supabase
    .from("prescriptions")
    .select(
      "id, patient_id, prescriber_id, medication, dose, sig, quantity, refills, pharmacy_name, status, signed_at, created_at",
    )
    .eq("id", rxId)
    .eq("patient_id", patientId)
    .maybeSingle()) as { data: RxRow | null };

  if (!rx) {
    return (
      <p className="muted">
        Prescription not found, or you don&apos;t have access.
      </p>
    );
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name, dob")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  const practice = await getPractice();

  // Prescriber name: the row's prescriber if it's not the current user, else me.
  let prescriberName = me.name as string | null;
  if (rx.prescriber_id && rx.prescriber_id !== me.id) {
    const { data: prescriber } = await supabase
      .from("practitioners")
      .select("name")
      .eq("id", rx.prescriber_id)
      .maybeSingle();
    prescriberName = (prescriber?.name as string) ?? prescriberName;
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "rx",
    resourceId: rxId,
    patientId,
  });

  const contact = (practice?.contact_json ?? {}) as Record<string, unknown>;
  const clinicName = practice?.name ?? "Clinic";
  const signed = rx.status === "signed" || rx.status === "sent" || rx.status === "filled";

  return (
    <div className="rx-print-root" style={{ maxWidth: 720, margin: "0 auto" }}>
      <style>{`
        @media print {
          [data-no-print] { display: none !important; }
          .rx-print-root { max-width: none !important; margin: 0 !important; }
          @page { margin: 18mm; }
        }
        .rx-watermark {
          position: fixed;
          top: 45%;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 96px;
          font-weight: 800;
          letter-spacing: 8px;
          color: rgba(180, 30, 60, 0.12);
          transform: rotate(-22deg);
          pointer-events: none;
          z-index: 0;
          text-transform: uppercase;
        }
      `}</style>

      <div
        data-no-print
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <PrintButton />
        <Link
          className="btn ghost"
          href={`/rx/${patientId}`}
          style={{ textDecoration: "none" }}
        >
          Back
        </Link>
      </div>

      {!signed && <div className="rx-watermark">Not Signed</div>}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "36px 40px",
        }}
      >
        {/* Letterhead */}
        <div
          style={{
            borderBottom: "2px solid var(--ink)",
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>
            {clinicName}
          </h1>
          {practice?.tagline && (
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              {practice.tagline}
            </p>
          )}
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>
            {[contact.address, contact.phone, contact.email]
              .filter((x) => typeof x === "string" && x)
              .join("  ·  ")}
          </p>
        </div>

        {/* Patient */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div className="muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
              PATIENT
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {patient?.first_name} {patient?.last_name}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              DOB: {patient?.dob ? fmtDate(patient.dob as string) : "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
              DATE
            </div>
            <div style={{ fontSize: 14 }}>
              {fmtDate(rx.signed_at ?? rx.created_at)}
            </div>
          </div>
        </div>

        {/* Rx body */}
        <div style={{ marginTop: 28 }}>
          <div
            className="serif"
            style={{ fontSize: 34, lineHeight: 1, color: "var(--ink)" }}
          >
            ℞
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {rx.medication}
              {rx.dose ? ` — ${rx.dose}` : ""}
            </div>
            {rx.sig && (
              <div style={{ fontSize: 15, marginTop: 8 }}>
                <span className="muted">Sig: </span>
                {rx.sig}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 12,
                fontSize: 14,
              }}
            >
              <div>
                <span className="muted">Quantity: </span>
                {rx.quantity ?? "—"}
              </div>
              <div>
                <span className="muted">Refills: </span>
                {rx.refills ?? 0}
              </div>
            </div>
            {rx.pharmacy_name && (
              <div style={{ fontSize: 14, marginTop: 8 }}>
                <span className="muted">Pharmacy: </span>
                {rx.pharmacy_name}
              </div>
            )}
          </div>
        </div>

        {/* Signature */}
        <div style={{ marginTop: 56, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 280 }}>
            <div
              style={{
                borderTop: "1.5px solid var(--ink)",
                paddingTop: 6,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 700 }}>{prescriberName ?? "Prescriber"}</div>
              <div className="muted">Prescriber signature</div>
              <div className="muted" style={{ marginTop: 4 }}>
                Date signed: {rx.signed_at ? fmtDate(rx.signed_at) : "____________________"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
