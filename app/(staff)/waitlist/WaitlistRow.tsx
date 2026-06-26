"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "waiting" | "offered" | "booked" | "removed";

const NEXT: Record<Status, { label: string; status: Status }[]> = {
  waiting: [{ label: "Mark offered", status: "offered" }, { label: "Remove", status: "removed" }],
  offered: [{ label: "Mark booked", status: "booked" }, { label: "Back to waiting", status: "waiting" }, { label: "Remove", status: "removed" }],
  booked: [{ label: "Remove", status: "removed" }],
  removed: [{ label: "Restore", status: "waiting" }],
};

export default function WaitlistRow({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function setStatus(next: Status) {
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {NEXT[status].map((a) => (
        <button
          key={a.status}
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => setStatus(a.status)}
          style={{ fontSize: 12 }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
