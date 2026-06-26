"use client";

import { useState } from "react";

export default function AddToWaitlistButton({ patientId }: { patientId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function add() {
    setState("busy");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      setState(res.ok ? "done" : "idle");
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      className="btn ghost"
      onClick={add}
      disabled={state !== "idle"}
      style={{ fontSize: 14 }}
    >
      {state === "done" ? "Added to waitlist ✓" : state === "busy" ? "Adding…" : "Add to waitlist"}
    </button>
  );
}
