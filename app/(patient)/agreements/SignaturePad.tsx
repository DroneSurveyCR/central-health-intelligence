"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageContext";

export default function SignaturePad({
  agreementKey,
  title,
}: {
  agreementKey: string;
  title: string;
}) {
  const router = useRouter();
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function ctx() {
    const c = canvasRef.current;
    return c ? c.getContext("2d") : null;
  }

  function pointFor(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    // Map CSS coords to the canvas' internal pixel size.
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const g = ctx();
    if (!g) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pointFor(e);
    g.beginPath();
    g.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const g = ctx();
    if (!g) return;
    const p = pointFor(e);
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#1e3a30";
    g.lineTo(p.x, p.y);
    g.stroke();
    hasInk.current = true;
    if (!dirty) setDirty(true);
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    drawing.current = false;
  }

  function clear() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
    setDirty(false);
    setErr("");
  }

  async function sign() {
    setErr("");
    if (!hasInk.current || !canvasRef.current) {
      setErr(t("sig_need_ink"));
      return;
    }
    setBusy(true);
    const signature = canvasRef.current.toDataURL("image/png");
    const res = await fetch("/api/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: agreementKey, title, signature }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || t("sig_save_error"));
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ marginTop: 14 }}>
      <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        {t("sig_hint")}
      </p>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{
          width: "100%",
          maxWidth: 600,
          height: 180,
          border: "1.5px solid var(--line)",
          borderRadius: 11,
          background: "#fff",
          touchAction: "none",
          display: "block",
          cursor: "crosshair",
        }}
      />
      {err && <p className="msg err" style={{ marginTop: 8 }}>{err}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button type="button" className="btn ghost" onClick={clear} disabled={busy}>
          {t("sig_clear")}
        </button>
        <button type="button" className="btn" onClick={sign} disabled={busy || !dirty}>
          {busy ? t("saving") : t("sig_agree")}
        </button>
      </div>
    </div>
  );
}
