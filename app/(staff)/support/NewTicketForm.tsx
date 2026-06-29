"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [category, setCategory] = useState("problem");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body: bodyText, category, priority }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Could not create ticket");
        return;
      }
      setSubject("");
      setBodyText("");
      setCategory("problem");
      setPriority("normal");
      if (j.id) router.push(`/support/${j.id}`);
      else router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line, #ddd)", fontSize: 14 };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input style={field} placeholder="Subject (e.g. 'Calendar not syncing')" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
      <textarea style={{ ...field, minHeight: 90, resize: "vertical" }} placeholder="Describe the problem, what you need, or the customization you'd like…" value={bodyText} onChange={(e) => setBodyText(e.target.value)} maxLength={8000} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13 }}>
          Type{" "}
          <select style={{ ...field, width: "auto", display: "inline-block" }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="problem">Problem</option>
            <option value="help">Help</option>
            <option value="customization">Customization</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Priority{" "}
          <select style={{ ...field, width: "auto", display: "inline-block" }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>
      {error && <p style={{ color: "#c0392b", margin: 0, fontSize: 13 }}>{error}</p>}
      <div>
        <button className="btn" type="submit" disabled={busy || !subject.trim()}>
          {busy ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
