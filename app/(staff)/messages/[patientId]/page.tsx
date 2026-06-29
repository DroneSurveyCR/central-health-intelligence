import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import StaffComposer from "./StaffComposer";
import DraftWithAiButton from "@/lib/ai/DraftWithAiButton";
import { aiEnabled } from "@/lib/ai";

type MessageRow = {
  id: string;
  sender: "patient" | "staff";
  body: string;
  read_at: string | null;
  created_at: string;
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diffMs / min), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (abs < 7 * day) return rtf.format(Math.round(diffMs / day), "day");
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function StaffMessagesPage({
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
        Client not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "messages", patientId });

  const { data: rows } = (await supabase
    .from("messages")
    .select("id, sender, body, read_at, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true })) as { data: MessageRow[] | null };

  const messages = rows ?? [];

  // Mark unread PATIENT messages as read now that staff is viewing them.
  const unreadPatientIds = messages
    .filter((m) => m.sender === "patient" && !m.read_at)
    .map((m) => m.id);
  if (unreadPatientIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadPatientIds);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <Link href={`/patients/${patientId}`} className="muted" style={{ fontSize: 13 }}>
        ← Back to record
      </Link>
      <h1 className="serif" style={{ fontSize: 28, margin: "6px 0 2px" }}>
        {patient.first_name} {patient.last_name}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        Messages
      </p>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              No messages yet.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            // Staff is the viewer here: their own (staff) bubbles align right,
            // the patient's bubbles align left.
            const mine = m.sender === "staff";
            const who = mine ? "You" : `${patient.first_name}`;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: 16,
                    borderBottomRightRadius: mine ? 4 : 16,
                    borderBottomLeftRadius: mine ? 16 : 4,
                    background: mine ? "rgba(20,131,78,0.12)" : "var(--paper, #fff)",
                    border: mine ? "1px solid rgba(20,131,78,0.25)" : "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--berry)" }}>
                      {who}
                    </span>
                    <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {relativeTime(m.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {messages.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <DraftWithAiButton
            endpoint="/api/ai/message-reply"
            body={{ patientId }}
            label="Draft reply with AI"
            aiEnabled={aiEnabled}
          />
        </div>
      )}

      <StaffComposer patientId={patientId} />
    </div>
  );
}
