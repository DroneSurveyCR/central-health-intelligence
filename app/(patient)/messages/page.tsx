import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import MessageComposer from "./MessageComposer";

type MessageRow = {
  id: string;
  sender: "patient" | "staff";
  body: string;
  read_at: string | null;
  created_at: string;
};

function relativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diffMs / min), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (abs < 7 * day) return rtf.format(Math.round(diffMs / day), "day");
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export default async function PatientMessagesPage() {
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const lang = await getServerLang();
  const locale = lang === "es" ? "es-CR" : "en-US";

  const { data: rows } = (await supabase
    .from("messages")
    .select("id, sender, body, read_at, created_at")
    .eq("patient_id", me.id)
    .order("created_at", { ascending: true })) as { data: MessageRow[] | null };

  const messages = rows ?? [];

  // Mark unread STAFF messages as read now that the patient is viewing them.
  const unreadStaffIds = messages
    .filter((m) => m.sender === "staff" && !m.read_at)
    .map((m) => m.id);
  if (unreadStaffIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadStaffIds);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 2px" }}>
        {t("messages_title", lang)}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        {t("messages_subtitle", lang)}
      </p>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              {t("messages_empty", lang)}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender === "patient";
            const who = mine ? t("messages_sender_you", lang) : t("messages_sender_team", lang);
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
                      {relativeTime(m.created_at, locale)}
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

      <MessageComposer />
    </div>
  );
}
