"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePanelButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this panel? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/biomarker?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      className="btn ghost"
      type="button"
      onClick={remove}
      disabled={busy}
      style={{ padding: "4px 12px", fontSize: 13 }}
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
