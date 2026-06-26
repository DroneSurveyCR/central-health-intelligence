"use client";

import { useState } from "react";
import type { MembershipPlan } from "@/lib/memberships/plans";
import { useT } from "@/lib/i18n/LanguageContext";

type Status = "idle" | "loading" | "sent" | "error";

export default function MembershipClient({ plan }: { plan: MembershipPlan }) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");

  async function request() {
    setStatus("loading");
    try {
      const res = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: plan.key }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) setStatus("sent");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="muted" style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5 }}>
        {t("membership_request_sent")}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={plan.highlighted ? "btn" : "btn ghost"}
        style={{ width: "100%" }}
        onClick={request}
        disabled={status === "loading"}
      >
        {status === "loading"
          ? t("membership_sending")
          : `${t("membership_request")} ${plan.name}`}
      </button>
      {status === "error" && (
        <p className="msg err" style={{ margin: "6px 0 0", fontSize: 12 }}>
          {t("error_generic")}
        </p>
      )}
    </div>
  );
}
