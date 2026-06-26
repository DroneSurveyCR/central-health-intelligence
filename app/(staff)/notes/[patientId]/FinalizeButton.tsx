"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FinalizeButton({ visitId }: { visitId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function finalize() {
    if (!confirm("Finalize this note? Once finalized it is locked and cannot be edited.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/visit-note", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: visitId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn ghost" onClick={finalize} disabled={busy} style={{ fontSize: 12 }}>
      {busy ? "Finalizing…" : "Finalize"}
    </button>
  );
}
