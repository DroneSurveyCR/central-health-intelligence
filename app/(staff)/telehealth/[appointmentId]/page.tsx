import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import VideoLauncher from "./VideoLauncher";

type Appt = {
  id: string;
  patient_id: string;
  type: string | null;
  modality: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  patients:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
};

function pname(a: Appt) {
  const p = Array.isArray(a.patients) ? a.patients[0] : a.patients;
  return p ? `${p.first_name} ${p.last_name}` : "Patient";
}

export default async function TelehealthPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  await requireStaff();
  await requireModule("telehealth");
  const { appointmentId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, type, modality, start_time, end_time, status, patients(first_name, last_name)",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  const appt = data as Appt | null;

  if (!appt) {
    return (
      <p className="muted">
        Appointment not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "telehealth",
    resourceId: appt.id,
    patientId: appt.patient_id,
  });

  // Deterministic, hard-to-guess-enough room name derived from the appointment
  // id. Same id -> same room, so staff and patient land in the same call.
  const room = `healthsync-${appt.id}`;
  const meetUrl = `https://meet.jit.si/${room}`;

  const start = appt.start_time ? new Date(appt.start_time) : null;
  const timeLabel = start
    ? start.toLocaleString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Time not set";

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          Telehealth visit
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${appt.patient_id}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Patient record
        </Link>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{pname(appt)}</div>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          {timeLabel}
          {appt.type ? ` · ${appt.type}` : ""}
        </p>
        {appt.modality && appt.modality !== "telehealth" && (
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Note: this appointment&apos;s modality is &quot;{appt.modality}&quot;, not
            telehealth.
          </p>
        )}

        <VideoLauncher room={room} patientLink={meetUrl} />

        <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
          Opens a public Jitsi room in a new tab. Share the patient link so they
          can join the same room.
        </p>
      </div>
    </div>
  );
}
