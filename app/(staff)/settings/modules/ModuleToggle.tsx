"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ModuleToggle({
  moduleId,
  enabled,
  locked = false,
}: {
  moduleId: string;
  enabled: boolean;
  locked?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (locked || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settings/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, enabled: !enabled }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (locked) {
    return <span className="badge">always on</span>;
  }

  return (
    <button
      type="button"
      className={enabled ? "btn" : "btn ghost"}
      onClick={toggle}
      disabled={busy}
      style={{ minWidth: 64, padding: "7px 11px", fontSize: 12.5 }}
    >
      {enabled ? "On" : "Off"}
    </button>
  );
}
