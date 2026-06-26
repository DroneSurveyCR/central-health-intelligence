import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import PaymentForm from "./PaymentForm";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bitcoin: "Bitcoin",
  zelle: "Zelle",
  stripe: "Stripe",
};

const money = (n: number) => `$${n.toFixed(2)}`;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type PaymentRow = {
  id: string;
  amount: number | null;
  method: string | null;
  receipt_ref: string | null;
  appointment_id: string | null;
  created_at: string | null;
};

type ApptRow = {
  id: string;
  start_time: string | null;
  type: string | null;
};

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return (
      <p className="muted">
        Patient not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "payments",
    resourceId: patientId,
    patientId,
  });

  const { data: paymentRows } = (await supabase
    .from("payments")
    .select("id, amount, method, receipt_ref, appointment_id, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })) as {
    data: PaymentRow[] | null;
  };

  const { data: apptRows } = (await supabase
    .from("appointments")
    .select("id, start_time, type")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("start_time", { ascending: false })) as { data: ApptRow[] | null };

  const payments = paymentRows ?? [];
  const appointments = apptRows ?? [];
  const total = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
        {patient.first_name} {patient.last_name}
      </h1>
      <p className="muted">Payments &amp; receipts</p>

      <div
        className="card"
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span className="muted" style={{ fontSize: 13 }}>
          Total collected
        </span>
        <span className="serif" style={{ fontSize: 24 }}>
          {money(total)}
        </span>
      </div>

      <PaymentForm
        patientId={patientId}
        appointments={appointments.map((a) => ({
          id: a.id,
          label: `${a.start_time ? formatDate(a.start_time) : "Appointment"}${
            a.type ? ` · ${a.type}` : ""
          }`,
        }))}
      />

      <h2 className="serif" style={{ fontSize: 19, marginTop: 28 }}>
        History
      </h2>

      {payments.length === 0 ? (
        <p className="muted">No payments recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {payments.map((p) => {
            const method = p.method ?? "";
            const methodLabel = METHOD_LABELS[method] ?? method;
            return (
              <div key={p.id} className="card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {formatDate(p.created_at ?? "")}
                    </span>
                    {methodLabel && (
                      <span className="badge">{methodLabel}</span>
                    )}
                    {p.receipt_ref && (
                      <span className="muted" style={{ fontSize: 13 }}>
                        Ref: {p.receipt_ref}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>
                    {money(Number(p.amount ?? 0))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
