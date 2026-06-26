"use client";

import { useRef, useState } from "react";

type Props = { patientId: string; onSaved?: () => void };

type Phase = "idle" | "recording" | "transcribing" | "review" | "saving" | "saved" | "error";

export default function VoiceNotePanel({ patientId, onSaved }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState("other");
  const [err, setErr] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); handleTranscribe(); };
      recorderRef.current = mr;
      mr.start();
      setPhase("recording");
    } catch {
      setErr("Microphone access denied. Check browser permissions.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setPhase("transcribing");
  }

  async function handleTranscribe() {
    const mimeType = recorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const form = new FormData();
    form.append("audio", blob, "note.webm");
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErr(json.error ?? "Transcription failed.");
        setPhase("idle");
        return;
      }
      setText(json.text ?? "");
      setPhase("review");
    } catch {
      setErr("Network error during transcription.");
      setPhase("idle");
    }
  }

  async function saveNote() {
    if (!text.trim()) return;
    setPhase("saving");
    try {
      const res = await fetch("/api/visit-note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, note: text.trim(), type: noteType }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setErr(json.error ?? "Save failed."); setPhase("review"); return; }
      setPhase("saved");
      setText("");
      onSaved?.();
      setTimeout(() => setPhase("idle"), 2000);
    } catch {
      setErr("Network error saving note.");
      setPhase("review");
    }
  }

  function reset() { setText(""); setErr(""); setPhase("idle"); }

  return (
    <div style={{ marginTop: 16, padding: 16, background: "var(--paper)", borderRadius: 12, border: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Voice note</span>
        {phase === "recording" && (
          <span style={{ fontSize: 12, color: "var(--berry)", fontWeight: 600, animation: "pulse 1s infinite" }}>
            ● Recording…
          </span>
        )}
        {phase === "transcribing" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Transcribing…</span>}
        {phase === "saved" && <span style={{ fontSize: 12, color: "green" }}>Saved ✓</span>}
      </div>

      {(phase === "idle" || phase === "recording") && (
        <div style={{ display: "flex", gap: 10 }}>
          {phase === "idle" ? (
            <button className="btn" onClick={startRecording}>🎙 Start recording</button>
          ) : (
            <button className="btn" style={{ background: "var(--berry)", color: "#fff" }} onClick={stopRecording}>
              ⏹ Stop
            </button>
          )}
        </div>
      )}

      {(phase === "review" || phase === "saving") && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              Type:
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "2px 6px", fontSize: 13 }}
              >
                <option value="consult">Consult</option>
                <option value="follow_up">Follow-up</option>
                <option value="scan_review">Scan review</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 12px",
              border: "1px solid var(--line)", borderRadius: 8, fontSize: 14,
              fontFamily: "inherit", resize: "vertical", background: "var(--bg)",
            }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="btn" onClick={saveNote} disabled={phase === "saving" || !text.trim()}>
              {phase === "saving" ? "Saving…" : "Save note"}
            </button>
            <button className="btn ghost" onClick={startRecording} disabled={phase === "saving"}>Re-record</button>
            <button className="btn ghost" onClick={reset} disabled={phase === "saving"}>Discard</button>
          </div>
        </div>
      )}

      {err && <p style={{ color: "var(--berry)", fontSize: 13, marginTop: 8 }}>{err}</p>}
    </div>
  );
}
