"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DraftActions({
  draftId,
  initialContent,
  editOnly = false,
}: {
  draftId: string;
  initialContent: string;
  /** When true, render only the Edit entry point (Approve/Reject live in the
   *  parent server-action forms) to avoid duplicate buttons. */
  editOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const router = useRouter();

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/ai-drafts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draftId, ...body }),
      });
      return res.ok;
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (await send({ action: "approve" })) router.refresh();
  }

  async function reject() {
    if (await send({ action: "reject" })) router.refresh();
  }

  async function saveEdit(thenApprove: boolean) {
    const ok = await send({ action: "edit", edited_content: content });
    if (!ok) return;
    if (thenApprove) {
      const ok2 = await send({
        action: "approve",
        edited_content: content,
      });
      if (!ok2) return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          style={{
            width: "100%",
            fontFamily: "inherit",
            fontSize: 14,
            padding: 8,
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => saveEdit(false)}
            style={{ fontSize: 12 }}
          >
            Save
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => saveEdit(true)}
            style={{ fontSize: 12 }}
          >
            Save &amp; approve
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              setContent(initialContent);
              setEditing(false);
            }}
            style={{ fontSize: 12 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (editOnly) {
    return (
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        onClick={() => setEditing(true)}
        style={{ fontSize: 12 }}
      >
        Edit
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={approve}
        style={{ fontSize: 12 }}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        onClick={() => setEditing(true)}
        style={{ fontSize: 12 }}
      >
        Edit
      </button>
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        onClick={reject}
        style={{ fontSize: 12 }}
      >
        Reject
      </button>
    </div>
  );
}
