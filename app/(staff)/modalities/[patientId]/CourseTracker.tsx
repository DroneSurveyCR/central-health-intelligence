"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourseTracker({
  courseId,
  sessionsDone,
  sessionsTotal,
  status,
}: {
  courseId: string;
  sessionsDone: number;
  sessionsTotal: number;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pct =
    sessionsTotal > 0
      ? Math.min(100, Math.round((sessionsDone / sessionsTotal) * 100))
      : 0;
  const atEnd = sessionsTotal > 0 && sessionsDone >= sessionsTotal;

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/modalities/course", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: courseId, ...payload }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not update course.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          Session {sessionsDone} of {sessionsTotal}
        </span>
        <span className="badge muted">{status}</span>
      </div>

      <div
        style={{
          height: 8,
          background: "var(--line)",
          borderRadius: 999,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--berry, #6b3f69)",
          }}
        />
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status !== "completed" && !atEnd && (
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => patch({ advance: 1 })}
            style={{ padding: "4px 12px", fontSize: 14 }}
          >
            Log a session
          </button>
        )}
        {status === "active" && (
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => patch({ status: "paused" })}
            style={{ padding: "4px 12px", fontSize: 14 }}
          >
            Pause
          </button>
        )}
        {status === "paused" && (
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => patch({ status: "active" })}
            style={{ padding: "4px 12px", fontSize: 14 }}
          >
            Resume
          </button>
        )}
        {status !== "completed" && (
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => patch({ status: "completed" })}
            style={{ padding: "4px 12px", fontSize: 14 }}
          >
            Mark complete
          </button>
        )}
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 8 }}>
          {err}
        </p>
      )}
    </div>
  );
}
