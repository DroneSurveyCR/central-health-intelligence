"use client";

// Protocol-aware quick-log card for /today. Renders only when the patient has
// an active plan AND the engagement module is on (the parent server component
// decides both). Lets the patient mark today's dose taken + tag how it felt,
// driving the existing progress_logs table via the engagement server actions.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/components/Toast";
import { logProtocolDose, FEELING_TAGS } from "./engagement-actions";

type Props = {
  /** Whether the patient already logged a protocol dose today (server-resolved). */
  alreadyLoggedToday: boolean;
  /** Label of the protocol / plan phase, for the card heading. */
  protocolLabel: string | null;
};

const TAG_KEY: Record<string, string> = {
  energized: "engagement_tag_energized",
  calm: "engagement_tag_calm",
  focused: "engagement_tag_focused",
  tired: "engagement_tag_tired",
  anxious: "engagement_tag_anxious",
  sore: "engagement_tag_sore",
  nauseous: "engagement_tag_nauseous",
  great: "engagement_tag_great",
};

export default function ProtocolQuickLog({
  alreadyLoggedToday,
  protocolLabel,
}: Props) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logged, setLogged] = useState(alreadyLoggedToday);

  function toggleTag(tag: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const res = await logProtocolDose({
        taken: true,
        tags: [...selected],
      });
      if (res.ok) {
        setLogged(true);
        toast.success(t("saved"));
        if (res.newMilestones && res.newMilestones.length > 0) {
          toast.success(`${t("engagement_milestone_earned")} ${res.newMilestones.join(" · ")}`);
        }
        router.refresh();
      } else {
        toast.error(res.error || "Couldn't save — please try again");
      }
    });
  }

  return (
    <div
      className="card"
      style={{ marginTop: 18, borderColor: "var(--berry)" }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h2 className="serif" style={{ fontSize: 18, margin: 0 }}>
          {t("engagement_protocol_title")}
          {protocolLabel ? <span className="muted" style={{ fontWeight: 400 }}> · {protocolLabel}</span> : null}
        </h2>
        {logged && (
          <span className="badge" style={{ whiteSpace: "nowrap" }}>
            {t("engagement_protocol_logged")}
          </span>
        )}
      </div>
      <p className="muted" style={{ margin: "4px 0 12px", fontSize: 13 }}>
        {t("engagement_protocol_hint")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {FEELING_TAGS.map((tag) => {
          const active = selected.has(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(tag)}
              disabled={pending}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: pending ? "wait" : "pointer",
                border: `1px solid ${active ? "var(--berry)" : "var(--line)"}`,
                background: active ? "var(--berry)" : "#fff",
                color: active ? "#fff" : "var(--ink, #1e3a30)",
              }}
            >
              {t(TAG_KEY[tag])}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn"
          onClick={submit}
          disabled={pending}
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          {pending ? t("saving") : `${t("engagement_protocol_taken")} ✓`}
        </button>
      </div>
    </div>
  );
}
