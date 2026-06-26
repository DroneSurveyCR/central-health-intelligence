"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function MfaEnroll() {
  const [qr, setQr] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      setMsg(error?.message ?? "Enrollment failed");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
  }

  async function verify() {
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId });
    if (ce || !ch) {
      setMsg(ce?.message ?? "Challenge failed");
      setBusy(false);
      return;
    }
    const { error: ve } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });
    setBusy(false);
    if (ve) {
      setMsg(ve.message);
      return;
    }
    setMsg("✓ Two-factor authentication is now enabled.");
    setQr("");
  }

  if (!qr)
    return (
      <button className="btn" type="button" onClick={start} disabled={busy}>
        {busy ? "…" : "Set up two-factor authentication"}
      </button>
    );

  return (
    <div className="card" style={{ maxWidth: 360 }}>
      <p className="muted" style={{ fontSize: 13 }}>
        Scan this with your authenticator app, then enter the 6-digit code.
      </p>
      <div style={{ margin: "12px 0" }} dangerouslySetInnerHTML={{ __html: qr }} />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        inputMode="numeric"
        style={{ width: "100%", padding: 12, border: "1.5px solid var(--line)", borderRadius: 11, textAlign: "center", letterSpacing: 4 }}
      />
      <button className="btn" type="button" onClick={verify} disabled={busy || code.length < 6} style={{ width: "100%", marginTop: 10 }}>
        Enable
      </button>
      {msg && <p className={msg.startsWith("✓") ? "msg ok" : "msg err"} style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
