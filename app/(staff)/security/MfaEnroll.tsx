"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Factor = { id: string; friendlyName: string | null; status: string };

export default function MfaEnroll() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(
      (data?.totp ?? []).map((f) => ({
        id: f.id,
        friendlyName: f.friendly_name ?? null,
        status: f.status,
      })),
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    setSecret(data.totp.secret);
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
    setSecret("");
    setCode("");
    setFactorId("");
    void refresh();
  }

  async function unenroll(id: string) {
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Authenticator removed.");
    void refresh();
  }

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Enrolled factors */}
      {verified.length > 0 && (
        <div className="card" style={{ maxWidth: 360 }}>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Active authenticators
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {verified.map((f) => (
              <li
                key={f.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <span>{f.friendlyName || "Authenticator app"}</span>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => unenroll(f.id)}
                  disabled={busy}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Enrollment flow */}
      {!qr ? (
        loaded && (
          <button className="btn" type="button" onClick={start} disabled={busy}>
            {busy ? "…" : verified.length > 0 ? "Add another authenticator" : "Set up two-factor authentication"}
          </button>
        )
      ) : (
        <div className="card" style={{ maxWidth: 360 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            Scan this with your authenticator app, then enter the 6-digit code.
          </p>
          <div style={{ margin: "12px 0" }} dangerouslySetInnerHTML={{ __html: qr }} />
          {secret && (
            <p className="muted" style={{ fontSize: 12 }}>
              Can&apos;t scan? Enter this key manually:
              <br />
              <code style={{ wordBreak: "break-all", letterSpacing: 1 }}>{secret}</code>
            </p>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            style={{ width: "100%", padding: 12, border: "1.5px solid var(--line)", borderRadius: 11, textAlign: "center", letterSpacing: 4 }}
          />
          <button
            className="btn"
            type="button"
            onClick={verify}
            disabled={busy || code.length < 6}
            style={{ width: "100%", marginTop: 10 }}
          >
            Enable
          </button>
        </div>
      )}

      {msg && (
        <p className={msg.startsWith("✓") ? "msg ok" : "msg err"} style={{ margin: 0 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
