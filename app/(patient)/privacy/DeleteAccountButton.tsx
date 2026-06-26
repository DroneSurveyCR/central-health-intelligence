"use client";

import { useState } from "react";

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    await fetch("/api/patient-data/delete", { method: "POST" });
    window.location.href = "/login";
  }

  if (!confirming)
    return (
      <button className="btn ghost" type="button" onClick={() => setConfirming(true)}>
        Request deletion
      </button>
    );

  return (
    <button
      className="btn"
      type="button"
      style={{ background: "var(--rust)" }}
      disabled={busy}
      onClick={del}
    >
      {busy ? "Deleting…" : "Confirm — delete my account"}
    </button>
  );
}
