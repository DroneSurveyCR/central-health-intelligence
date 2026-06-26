"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  marginBottom: 4,
};

export default function OnboardingForm() {
  const router = useRouter();
  const [practiceName, setPracticeName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceName, slug, ownerName, ownerEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setDone(true);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <p className="serif" style={{ fontSize: 16, marginTop: 0 }}>
          Practice created — you can now sign in.
        </p>
        <a className="btn" href="/login" style={{ display: "inline-block", marginTop: 8 }}>
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div>
        <label style={labelStyle}>Practice name</label>
        <input
          style={inputStyle}
          value={practiceName}
          onChange={(e) => setPracticeName(e.target.value)}
          placeholder="Evergreen Wellness"
          required
        />
      </div>

      <div>
        <label style={labelStyle}>Slug</label>
        <input
          style={inputStyle}
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9-]/g, ""))
          }
          placeholder="evergreen"
          required
        />
        <span className="muted" style={{ fontSize: 12 }}>
          Lowercase, no spaces. Used in your practice URL.
        </span>
      </div>

      <div>
        <label style={labelStyle}>Your name</label>
        <input
          style={inputStyle}
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="Dr. Jane Smith"
          required
        />
      </div>

      <div>
        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="jane@evergreen.com"
          required
        />
      </div>

      <div>
        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>

      {error && (
        <p style={{ color: "var(--berry)", fontSize: 13, margin: 0 }}>{error}</p>
      )}

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 4 }}>
        {busy ? "Creating…" : "Create practice"}
      </button>

      <p className="muted" style={{ fontSize: 12.5, textAlign: "center", margin: 0 }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </form>
  );
}
