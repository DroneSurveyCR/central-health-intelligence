"use client";

import { useRef, useState } from "react";

/** Records mic audio → POSTs to /api/transcribe → returns text via onText. */
export default function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [err, setErr] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setErr("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr("Recording isn’t supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErr("Microphone permission denied.");
      return;
    }
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("working");
      try {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "note.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const json = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok || json.error) setErr(json.error ?? "Transcription failed.");
        else if (json.text) onText(json.text.trim());
      } catch {
        setErr("Transcription failed.");
      } finally {
        setState("idle");
      }
    };
    rec.start();
    recRef.current = rec;
    setState("recording");
  }

  function stop() {
    recRef.current?.stop();
    recRef.current = null;
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={state === "working"}
        className="btn ghost"
        style={{ padding: "5px 11px", fontSize: 13, color: state === "recording" ? "#c0392b" : undefined }}
      >
        {state === "recording" ? "Stop recording" : state === "working" ? "Transcribing…" : "Dictate"}
      </button>
      {err && <span style={{ color: "var(--rust, #c0392b)", fontSize: 12 }}>{err}</span>}
    </span>
  );
}
