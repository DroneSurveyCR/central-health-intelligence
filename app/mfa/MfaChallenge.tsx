"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function MfaChallenge() {
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.[0];
      if (totp) setFactorId(totp.id);
      else window.location.href = "/focus";
    });
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId });
    if (ce || !ch) {
      setErr(ce?.message ?? "Could not start challenge");
      setBusy(false);
      return;
    }
    const { error: ve } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });
    if (ve) {
      setErr(ve.message);
      setBusy(false);
      return;
    }
    window.location.href = "/focus";
  }

  return (
    <form className="card" onSubmit={verify} style={{ maxWidth: 360 }}>
      <h2 className="serif" style={{ marginTop: 0 }}>Verify it&apos;s you</h2>
      <p className="muted" style={{ fontSize: 13 }}>Enter the 6-digit code from your authenticator app.</p>
      {err && <p className="msg err">{err}</p>}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        style={{ width: "100%", padding: 12, border: "1.5px solid var(--line)", borderRadius: 11, fontSize: 18, letterSpacing: 4, textAlign: "center", margin: "12px 0" }}
      />
      <button className="btn" type="submit" disabled={busy || code.length < 6} style={{ width: "100%" }}>
        {busy ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
