"use client";

import { useMemo, useState } from "react";
import {
  VERTEBRAE,
  BODY_REGIONS,
  SEVERITY_OPTIONS,
  SEVERITY_HEX,
  CURVE_NORMS,
  SPINE_CONDITION_FLAGS,
  classifyScoliosis,
  classifyCurve,
  dermatomeFor,
  blankVertebra,
  blankSpineConditions,
  type SpineSeverity,
  type SubluxationDir,
  type MotionState,
  type CurveId,
  type VertebraFinding,
  type SpineConditions,
} from "@/lib/spine/schema";
import { scoreSpine } from "@/lib/spine/score";
import SpineScoreTrend from "./SpineScoreTrend";
import SpineColumn from "./SpineColumn";
import VoiceButton from "./VoiceButton";
import ThermalUpload from "./ThermalUpload";
import BodyMapTabs from "@/lib/body3d/BodyMapTabs";

type RegionFinding = { id: string; severity: SpineSeverity; note: string };
type VoiceNote = { region_code: string; transcript: string; created_at: string };

type Existing = {
  id: string;
  vertebrae?: unknown;
  conditions?: unknown;
  regions?: unknown;
  voice_notes?: unknown;
  thermal_ref?: unknown;
  status?: string;
} | null;

const LISTING: { value: SubluxationDir; label: string }[] = [
  { value: "anterior", label: "Ant" },
  { value: "posterior", label: "Post" },
  { value: "left", label: "L" },
  { value: "right", label: "R" },
  { value: "rotation_left", label: "Rot-L" },
  { value: "rotation_right", label: "Rot-R" },
  { value: "flexion", label: "Flex" },
  { value: "extension", label: "Ext" },
];

const MOTION: { value: MotionState; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "hypomobile", label: "Hypomobile" },
  { value: "hypermobile", label: "Hypermobile" },
  { value: "fixated", label: "Fixated" },
];

const SCORE_HEX: Record<string, string> = {
  excellent: "#14834e",
  good: "#6fae84",
  fair: "#f4a63c",
  guarded: "#ee7a4f",
  poor: "#c0392b",
};

function initVertebrae(existing: unknown): Record<string, VertebraFinding> {
  const map: Record<string, VertebraFinding> = {};
  for (const v of VERTEBRAE) map[v.id] = blankVertebra(v.id);
  if (Array.isArray(existing)) {
    for (const f of existing) {
      const code = String((f as { region_code?: string })?.region_code || "").toLowerCase();
      if (map[code]) map[code] = { ...map[code], ...(f as VertebraFinding), region_code: code };
    }
  }
  return map;
}

function initRegions(existing: unknown): RegionFinding[] {
  const base: RegionFinding[] = BODY_REGIONS.map((r) => ({ id: r.id, severity: "normal", note: "" }));
  if (Array.isArray(existing)) {
    for (const e of existing) {
      const i = base.findIndex((b) => b.id === (e as { id?: string })?.id);
      if (i >= 0) base[i] = { ...base[i], ...(e as RegionFinding) };
    }
  }
  return base;
}

function initConditions(existing: unknown): SpineConditions {
  const blank = blankSpineConditions();
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return { ...blank, ...(existing as SpineConditions), scoliosis: { ...blank.scoliosis, ...(existing as SpineConditions).scoliosis }, curves: { ...(existing as SpineConditions).curves } };
  }
  return blank;
}

export default function SpineAssessmentEditor({
  patientId,
  existing,
  viewer = "both",
  scoreHistory = [],
}: {
  patientId: string;
  existing: Existing;
  viewer?: string;
  scoreHistory?: { date: string; score: number }[];
}) {
  const [assessmentId, setAssessmentId] = useState<string | null>(existing?.id ?? null);
  const [vertebrae, setVertebrae] = useState<Record<string, VertebraFinding>>(() => initVertebrae(existing?.vertebrae));
  const [regions, setRegions] = useState<RegionFinding[]>(() => initRegions(existing?.regions));
  const [conditions, setConditions] = useState<SpineConditions>(() => initConditions(existing?.conditions));
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>(
    Array.isArray(existing?.voice_notes) ? (existing?.voice_notes as VoiceNote[]) : [],
  );
  const [selected, setSelected] = useState<string>("c1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const severityByCode = useMemo(() => {
    const out: Record<string, SpineSeverity> = {};
    for (const v of VERTEBRAE) out[v.id] = vertebrae[v.id]?.s2.severity ?? "normal";
    return out;
  }, [vertebrae]);

  const flaggedCount = useMemo(
    () => VERTEBRAE.filter((v) => severityByCode[v.id] !== "normal").length,
    [severityByCode],
  );

  const spineScore = useMemo(
    () => scoreSpine(Object.values(vertebrae), conditions, regions, "s2"),
    [vertebrae, conditions, regions],
  );

  const sel = vertebrae[selected];
  const selLabel = VERTEBRAE.find((v) => v.id === selected)?.label ?? selected;

  function setPoint(code: string, patch: Partial<VertebraFinding["s2"]>) {
    setSaved(false);
    setVertebrae((prev) => ({ ...prev, [code]: { ...prev[code], s2: { ...prev[code].s2, ...patch } } }));
  }
  function setNote(code: string, note: string) {
    setSaved(false);
    setVertebrae((prev) => ({ ...prev, [code]: { ...prev[code], note } }));
  }
  function toggleListing(code: string, dir: SubluxationDir) {
    const cur = vertebrae[code].s2.listing;
    const next = cur.includes(dir) ? cur.filter((d) => d !== dir) : [...cur, dir];
    setPoint(code, { listing: next });
  }
  function addDictation(code: string, text: string) {
    if (!text) return;
    setNote(code, [vertebrae[code].note, text].filter(Boolean).join(" "));
    setVoiceNotes((prev) => [...prev, { region_code: code, transcript: text, created_at: new Date().toISOString() }]);
  }

  function serializeVertebrae(): VertebraFinding[] {
    return Object.values(vertebrae).filter(
      (v) => v.s2.severity !== "normal" || v.s2.listing.length > 0 || v.s2.motion !== "normal" || v.note.trim(),
    );
  }

  async function save(finalize: boolean) {
    setBusy(true);
    setErr("");
    setSaved(false);
    const payload = {
      vertebrae: serializeVertebrae(),
      conditions,
      regions: regions.filter((r) => r.severity !== "normal" || r.note.trim()),
      voice_notes: voiceNotes,
      status: finalize ? "final" : "draft",
    };
    try {
      const res = assessmentId
        ? await fetch("/api/spine", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: assessmentId, ...payload }),
          })
        : await fetch("/api/spine", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ patientId, ...payload }),
          });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Save failed.");
      else {
        if (json.id) setAssessmentId(json.id);
        setSaved(true);
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const scoliosisGrade = classifyScoliosis(conditions.scoliosis.cobbDeg || 0);

  return (
    <div style={{ marginTop: 16 }}>
      {/* alignment score */}
      <section className="card" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center", minWidth: 74 }}>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: SCORE_HEX[spineScore.band] }}>{spineScore.score}</div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>/ 100</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: SCORE_HEX[spineScore.band], textTransform: "capitalize" }}>
            {spineScore.band} alignment
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "3px 0 0" }}>
            Composite alignment index for tracking — not a diagnosis. 100 = ideal alignment.
          </p>
          {spineScore.deductions.length > 0 && (
            <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
              {spineScore.deductions.map((d) => `${d.label} −${d.points}`).join(" · ")}
            </p>
          )}
        </div>
      </section>

      <SpineScoreTrend points={scoreHistory} />

      {/* legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {SEVERITY_OPTIONS.map((s) => (
          <span key={s.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: SEVERITY_HEX[s.value], display: "inline-block" }} />
            {s.label}
          </span>
        ))}
        <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
          {flaggedCount} vertebra{flaggedCount === 1 ? "" : "e"} flagged
        </span>
      </div>

      <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Spine column */}
        <div style={{ flex: "0 0 240px" }}>
          <SpineColumn severityByCode={severityByCode} selected={selected} onSelect={setSelected} />
        </div>

        {/* Selected vertebra panel */}
        <div className="card" style={{ flex: "1 1 380px", minWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="serif" style={{ fontSize: 20, margin: 0 }}>{selLabel}</h2>
            <span className="muted" style={{ fontSize: 13 }}>vertebra findings</span>
          </div>
          {dermatomeFor(selected) && (
            <p className="muted" style={{ fontSize: 12, margin: "5px 0 0" }}>Dermatome · {dermatomeFor(selected)}</p>
          )}

          {/* severity */}
          <p className="muted" style={{ fontSize: 12.5, margin: "14px 0 5px" }}>Severity</p>
          <div style={{ display: "flex", gap: 6 }}>
            {SEVERITY_OPTIONS.map((s) => {
              const on = sel.s2.severity === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setPoint(selected, { severity: s.value })}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 9,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: on ? 700 : 400,
                    border: `1px solid ${on ? SEVERITY_HEX[s.value] : "var(--line)"}`,
                    background: on ? SEVERITY_HEX[s.value] : "transparent",
                    color: on && s.value !== "normal" ? "#fff" : "inherit",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* listing */}
          <p className="muted" style={{ fontSize: 12.5, margin: "16px 0 5px" }}>Listing / subluxation</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LISTING.map((l) => {
              const on = sel.s2.listing.includes(l.value);
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => toggleListing(selected, l.value)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: on ? 700 : 400,
                    border: "1px solid var(--line)",
                    background: on ? "var(--ink, #1f2937)" : "transparent",
                    color: on ? "#fff" : "inherit",
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>

          {/* motion */}
          <p className="muted" style={{ fontSize: 12.5, margin: "16px 0 5px" }}>Motion (palpation)</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MOTION.map((m) => {
              const on = sel.s2.motion === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPoint(selected, { motion: m.value })}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: on ? 700 : 400,
                    border: "1px solid var(--line)",
                    background: on ? "var(--berry, #14834e)" : "transparent",
                    color: on ? "#fff" : "inherit",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* note + dictation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 5px" }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Note</span>
            <VoiceButton onText={(t) => addDictation(selected, t)} />
          </div>
          <textarea
            value={sel.note}
            onChange={(e) => setNote(selected, e.target.value)}
            rows={3}
            placeholder={`Findings for ${selLabel}…`}
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)", padding: "9px 11px", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Overall spine conditions */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Overall spine</h2>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: 13 }}>
            <span className="muted" style={{ display: "block", marginBottom: 4 }}>Scoliosis — Cobb angle°</span>
            <input
              type="number"
              min={0}
              value={conditions.scoliosis.cobbDeg || ""}
              onChange={(e) =>
                setConditions((c) => ({ ...c, scoliosis: { ...c.scoliosis, cobbDeg: Number(e.target.value) || 0 } }))
              }
              style={{ width: 90, borderRadius: 8, border: "1px solid var(--line)", padding: "7px 9px", fontSize: 14 }}
            />
          </label>
          <span className="badge" style={{ background: scoliosisGrade === "none" ? "var(--muted)" : "#c2410c" }}>
            {scoliosisGrade === "none" ? "no scoliosis" : `${scoliosisGrade} scoliosis`}
          </span>
        </div>

        <p className="muted" style={{ fontSize: 12.5, margin: "18px 0 6px" }}>Sagittal curves (degrees) — flags hypo/hyper vs norm</p>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {(Object.keys(CURVE_NORMS) as CurveId[]).map((id) => {
            const norm = CURVE_NORMS[id];
            const val = conditions.curves[id];
            const cls = val != null ? classifyCurve(id, val) : null;
            return (
              <label key={id} style={{ fontSize: 13 }}>
                <span className="muted" style={{ display: "block", marginBottom: 4 }}>
                  {norm.label} <span style={{ opacity: 0.7 }}>({norm.min}–{norm.max})</span>
                </span>
                <input
                  type="number"
                  value={val ?? ""}
                  onChange={(e) =>
                    setConditions((c) => ({
                      ...c,
                      curves: { ...c.curves, [id]: e.target.value === "" ? undefined : Number(e.target.value) },
                    }))
                  }
                  style={{
                    width: 90,
                    borderRadius: 8,
                    padding: "7px 9px",
                    fontSize: 14,
                    border: `1px solid ${cls && cls !== "normal" ? "#c2410c" : "var(--line)"}`,
                  }}
                />
                {cls && <span style={{ fontSize: 11.5, color: cls === "normal" ? "var(--berry,#14834e)" : "#c2410c", marginLeft: 6 }}>{cls}</span>}
              </label>
            );
          })}
        </div>

        <p className="muted" style={{ fontSize: 12.5, margin: "18px 0 6px" }}>Conditions</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SPINE_CONDITION_FLAGS.map((f) => {
            const on = conditions.flags.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  setConditions((c) => ({
                    ...c,
                    flags: on ? c.flags.filter((x) => x !== f.id) : [...c.flags, f.id],
                  }))
                }
                style={{
                  padding: "6px 11px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: on ? 700 : 400,
                  border: "1px solid var(--line)",
                  background: on ? "#c2410c" : "transparent",
                  color: on ? "#fff" : "inherit",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Postural chain regions */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Postural chain</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {regions.map((r, i) => {
            const label = BODY_REGIONS.find((b) => b.id === r.id)?.label ?? r.id;
            return (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: "0 0 150px", fontSize: 14 }}>{label}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  {SEVERITY_OPTIONS.map((s) => {
                    const on = r.severity === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() =>
                          setRegions((prev) => prev.map((x, j) => (j === i ? { ...x, severity: s.value } : x)))
                        }
                        aria-label={`${label} ${s.label}`}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          cursor: "pointer",
                          border: `1.5px solid ${on ? "var(--ink,#1f2937)" : "var(--line)"}`,
                          background: SEVERITY_HEX[s.value],
                          opacity: on ? 1 : 0.45,
                        }}
                      />
                    );
                  })}
                </div>
                <input
                  value={r.note}
                  onChange={(e) => setRegions((prev) => prev.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                  placeholder="note"
                  style={{ flex: "1 1 160px", borderRadius: 8, border: "1px solid var(--line)", padding: "6px 9px", fontSize: 13.5 }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <ThermalUpload
        assessmentId={assessmentId}
        existingRef={typeof existing?.thermal_ref === "string" ? existing.thermal_ref : null}
      />

      {(viewer === "3d" || viewer === "both") && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>3D body</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Premium 3D anatomy (admin-enabled). Per-vertebra overlay onto this model is on the roadmap; today it shows the interactive body model.
          </p>
          <BodyMapTabs patient={patientId} title="3D body" />
        </section>
      )}

      {/* Save bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={busy} onClick={() => save(false)} style={{ padding: "9px 18px" }}>
          {busy ? "Saving…" : assessmentId ? "Save draft" : "Create assessment"}
        </button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => save(true)} style={{ padding: "9px 18px" }}>
          Save & finalize
        </button>
        {saved && <span style={{ color: "var(--berry, #14834e)", fontSize: 13 }}>Saved.</span>}
        {err && <span style={{ color: "var(--rust, #c0392b)", fontSize: 13 }}>{err}</span>}
      </div>
    </div>
  );
}
