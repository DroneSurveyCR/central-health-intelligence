"use client";

import { useState } from "react";

export default function DisconnectButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm("Disconnect this clinic's Stripe account? Clients won't be able to pay by card until you reconnect.")) return;
    setBusy(true);
    await fetch("/api/connect/disconnect", { method: "POST" });
    window.location.reload();
  }
  return (
    <button type="button" className="btn" onClick={go} disabled={busy}>
      {busy ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
