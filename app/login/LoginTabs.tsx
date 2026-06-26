"use client";

import { useState } from "react";
import { sendMagicLink, signInStaff } from "./actions";

export default function LoginTabs({
  sent,
  error,
  initialTab,
}: {
  sent?: string;
  error?: string;
  initialTab?: "patient" | "staff";
}) {
  const [tab, setTab] = useState<"patient" | "staff">(initialTab ?? "patient");

  return (
    <div className="card">
      <div className="tabs">
        <button
          type="button"
          className={tab === "patient" ? "tab on" : "tab"}
          onClick={() => setTab("patient")}
        >
          I&apos;m a patient
        </button>
        <button
          type="button"
          className={tab === "staff" ? "tab on" : "tab"}
          onClick={() => setTab("staff")}
        >
          Staff
        </button>
      </div>

      {error && <p className="msg err">{error}</p>}

      {tab === "patient" ? (
        sent ? (
          <p className="msg ok">
            Check <b>{sent}</b> — we sent you a secure sign-in link.
          </p>
        ) : (
          <form action={sendMagicLink} className="form">
            <label>
              Email
              <input name="email" type="email" required placeholder="you@email.com" />
            </label>
            <button className="btn" type="submit">
              Send my sign-in link
            </button>
            <p className="hint">No password — we email you a secure link.</p>
          </form>
        )
      ) : (
        <form action={signInStaff} className="form">
          <label>
            Email
            <input name="email" type="email" required placeholder="you@clinic.com" />
          </label>
          <label>
            Password
            <input name="password" type="password" required />
          </label>
          <button className="btn" type="submit">
            Sign in
          </button>
          <p className="hint">Staff accounts use a password + verification code.</p>
        </form>
      )}
    </div>
  );
}
