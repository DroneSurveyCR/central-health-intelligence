"use client";

import { useMemo, useState } from "react";
import { MODULES, DEFAULT_ON } from "@/lib/modules/manifest";
import type { ModuleId } from "@/lib/modules/types";

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

// ---------------------------------------------------------------------------
// Vertical -> extra modules preselected (ON TOP of DEFAULT_ON, which is always
// applied). These are suggestions the user can toggle in Step 3. The API
// re-validates every id against the manifest and always re-adds DEFAULT_ON.
// ---------------------------------------------------------------------------
type Vertical =
  | "integrative"
  | "longevity"
  | "peptide"
  | "psychedelic"
  | "functional"
  | "womens";

const VERTICALS: { id: Vertical; label: string; blurb: string }[] = [
  { id: "integrative", label: "Integrative", blurb: "Whole-person care across labs & wearables." },
  { id: "longevity", label: "Longevity", blurb: "Biomarkers, biological age, optimization." },
  { id: "peptide", label: "Peptide & GLP-1", blurb: "Peptide / GLP-1 protocols + e-Rx." },
  { id: "psychedelic", label: "Plant Medicine", blurb: "Screening, sessions, integration." },
  { id: "functional", label: "Functional", blurb: "Labs, nutrition & root-cause workups." },
  { id: "womens", label: "Women's Health", blurb: "Hormone optimization (HRT) + labs." },
];

// Extra (vertical-specific) modules on top of DEFAULT_ON.
const VERTICAL_MODULES: Record<Vertical, ModuleId[]> = {
  integrative: ["labs", "wearables", "nutrition"],
  longevity: ["labs", "wearables", "weight", "longevity"],
  peptide: ["labs", "rx", "peptide"],
  psychedelic: ["labs", "psychedelic"],
  functional: ["labs", "nutrition", "weight"],
  womens: ["labs", "rx", "hrt"],
};

const ALL_IDS = Object.keys(MODULES) as ModuleId[];
const DEFAULT_SET = new Set<ModuleId>(DEFAULT_ON as ModuleId[]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingForm() {
  const [step, setStep] = useState(1);

  // Step 1
  const [practiceName, setPracticeName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [vertical, setVertical] = useState<Vertical | null>(null);

  // Step 3 — the toggleable module set (excludes always-on "core").
  const [modules, setModules] = useState<Set<ModuleId>>(new Set());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onNameChange(value: string) {
    setPracticeName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function selectVertical(v: Vertical) {
    setVertical(v);
    // Preselect: DEFAULT_ON + vertical extras (minus always-on core).
    const next = new Set<ModuleId>();
    for (const id of DEFAULT_ON as ModuleId[]) if (id !== "core") next.add(id);
    for (const id of VERTICAL_MODULES[v]) next.add(id);
    setModules(next);
  }

  function toggle(id: ModuleId) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Modules shown in the review list: everything except always-on core.
  const reviewable = useMemo(
    () => ALL_IDS.filter((id) => !MODULES[id].alwaysOn),
    [],
  );

  const step1Valid =
    practiceName.trim() && slug.trim() && ownerName.trim() && ownerEmail.trim() && password.length >= 8;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceName,
          slug,
          ownerName,
          ownerEmail,
          password,
          vertical,
          modules: Array.from(modules),
        }),
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
    <div style={{ display: "grid", gap: 16 }}>
      {/* Step indicator */}
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        Step {step} of 4
      </p>

      {/* ---- STEP 1: practice + owner ---- */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step1Valid) setStep(2);
          }}
          style={{ display: "grid", gap: 14 }}
        >
          <div>
            <label style={labelStyle}>Practice name</label>
            <input
              style={inputStyle}
              value={practiceName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Evergreen Wellness"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Slug</label>
            <input
              style={inputStyle}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(
                  e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                );
              }}
              placeholder="evergreen"
              required
            />
            <span className="muted" style={{ fontSize: 12 }}>
              Auto-suggested from your name. Used in your public URL: /p/{slug || "your-slug"}
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

          <button className="btn" type="submit" disabled={!step1Valid} style={{ marginTop: 4 }}>
            Continue
          </button>

          <p className="muted" style={{ fontSize: 12.5, textAlign: "center", margin: 0 }}>
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </form>
      )}

      {/* ---- STEP 2: pick a vertical ---- */}
      {step === 2 && (
        <div style={{ display: "grid", gap: 14 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Pick the focus that best fits your practice. We&apos;ll preselect the right modules.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {VERTICALS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVertical(v.id)}
                className="card"
                style={{
                  textAlign: "left",
                  padding: 14,
                  cursor: "pointer",
                  borderColor: vertical === v.id ? "var(--berry)" : "var(--line)",
                  borderWidth: vertical === v.id ? 2 : 1,
                  borderStyle: "solid",
                  background: "var(--paper)",
                }}
              >
                <strong>{v.label}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {v.blurb}
                </div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              disabled={!vertical}
              onClick={() => setStep(3)}
              style={{ flex: 1 }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ---- STEP 3: review / toggle modules ---- */}
      {step === 3 && (
        <div style={{ display: "grid", gap: 14 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            These modules will be enabled. Core platform is always on. Toggle any others.
          </p>
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            <div className="card" style={{ padding: "10px 14px", opacity: 0.75 }}>
              <strong>{MODULES.core.label}</strong>{" "}
              <span className="muted" style={{ fontSize: 12 }}>
                (always on)
              </span>
            </div>
            {reviewable.map((id) => {
              const m = MODULES[id];
              const on = modules.has(id);
              const isDefault = DEFAULT_SET.has(id);
              return (
                <label
                  key={id}
                  className="card"
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    borderColor: on ? "var(--berry)" : "var(--line)",
                  }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                  <span style={{ flex: 1 }}>
                    {m.label}
                    {isDefault && (
                      <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>
                        included
                      </span>
                    )}
                  </span>
                  {m.price > 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      ${m.price}/mo
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn" type="button" onClick={() => setStep(4)} style={{ flex: 1 }}>
              Review &amp; create
            </button>
          </div>
        </div>
      )}

      {/* ---- STEP 4: confirm + submit ---- */}
      {step === 4 && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14 }}>
              <div>
                <strong>{practiceName}</strong>{" "}
                <span className="muted">/p/{slug}</span>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {ownerName} · {ownerEmail}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Vertical: {vertical}
              </div>
              <div style={{ fontSize: 13, marginTop: 8 }}>
                {modules.size + 1} modules: core, {Array.from(modules).join(", ")}
              </div>
            </div>
          </div>

          {error && <p style={{ color: "var(--berry)", fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={() => setStep(3)} disabled={busy}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              onClick={submit}
              disabled={busy}
              style={{ flex: 1 }}
            >
              {busy ? "Creating…" : "Create practice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
