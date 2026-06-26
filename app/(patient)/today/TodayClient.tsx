"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanLevel } from "@/lib/plan/helpers";
import { useT } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/components/Toast";

type ToastApi = ReturnType<typeof useToast>;

export type TodayItem = {
  id: string;
  name: string;
  detail: string | null;
  dose: string | null;
  completed: boolean;
};

export type TodayLevelGroup = {
  level: PlanLevel;
  label: string;
  items: TodayItem[];
};

type Props = {
  todayISO: string;
  phaseLabel: string | null;
  levelGroups: TodayLevelGroup[];
  firstName: string | null;
};

const chip = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.3,
  background: bg,
  color: fg,
});

export default function TodayClient({
  todayISO,
  phaseLabel,
  levelGroups,
  firstName,
}: Props) {
  const router = useRouter();
  const t = useT();
  const toast = useToast();

  // Optimistic completion state, keyed by plan_item_id.
  const initial: Record<string, boolean> = {};
  for (const g of levelGroups) for (const it of g.items) initial[it.id] = it.completed;
  const [done, setDone] = useState<Record<string, boolean>>(initial);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const totalItems = levelGroups.reduce((n, g) => n + g.items.length, 0);
  const doneCount = Object.values(done).filter(Boolean).length;

  async function post(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function toggle(itemId: string) {
    if (busy[itemId]) return;
    const next = !done[itemId];
    setDone((d) => ({ ...d, [itemId]: next }));
    setBusy((b) => ({ ...b, [itemId]: true }));
    const ok = await post({
      action: "toggle_completion",
      plan_item_id: itemId,
      date: todayISO,
      completed: next,
    });
    if (ok) {
      // Keep the item busy until the server-rendered state has refreshed,
      // otherwise the checkbox can flicker / re-toggle against stale data.
      toast.success(t("saved"));
      await router.refresh();
    } else {
      // Roll back on failure.
      setDone((d) => ({ ...d, [itemId]: !next }));
      toast.error("Couldn't save — please try again");
    }
    setBusy((b) => ({ ...b, [itemId]: false }));
  }

  return (
    <div>
      {/* Checklist */}
      {totalItems > 0 ? (
        <div className="card" style={{ marginTop: 22, borderColor: "var(--berry)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h2 className="serif" style={{ fontSize: 20, margin: 0 }}>
              {phaseLabel ? `${t("today_label")} · ${phaseLabel}` : t("today_checklist")}
            </h2>
            <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
              {doneCount}/{totalItems} {t("today_done_suffix")}
            </span>
          </div>
          {doneCount === totalItems && (
            <p style={{ margin: "8px 0 0", color: "var(--berry)", fontWeight: 600 }}>
              {t("today_all_done")}{firstName ? `, ${firstName}` : ""} {t("today_all_done_tail")}
            </p>
          )}
          {levelGroups.map((g) => (
            <div key={g.level} style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--berry)", fontWeight: 700 }}>
                {g.label}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0" }}>
                {g.items.map((it) => {
                  const checked = !!done[it.id];
                  return (
                    <li key={it.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 0",
                          cursor: busy[it.id] ? "wait" : "pointer",
                          opacity: busy[it.id] ? 0.6 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!!busy[it.id]}
                          onChange={() => toggle(it.id)}
                          style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--berry)", flex: "none" }}
                        />
                        <span style={{ flex: 1 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              textDecoration: checked ? "line-through" : "none",
                              color: checked ? "var(--muted, #6b7a72)" : "inherit",
                            }}
                          >
                            {it.name}
                          </span>
                          {it.dose && <span className="muted"> · {it.dose}</span>}
                          {it.detail && (
                            <span className="muted" style={{ display: "block", fontSize: 13 }}>
                              {it.detail}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 22 }}>
          <p style={{ margin: 0 }}>{t("today_no_items")}</p>
        </div>
      )}

      <FeelingLogger post={post} onSaved={() => router.refresh()} t={t} toast={toast} />
      <VitalLogger post={post} onSaved={() => router.refresh()} t={t} toast={toast} />
    </div>
  );
}

function FeelingLogger({
  post,
  onSaved,
  t,
  toast,
}: {
  post: (payload: Record<string, unknown>) => Promise<boolean>;
  onSaved: () => void;
  t: (key: string) => string;
  toast: ToastApi;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    if (score === null || saving) return;
    setSaving(true);
    const ok = await post({
      action: "log_feeling",
      score,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setNote("");
      toast.success(t("saved"));
      onSaved();
    } else {
      toast.error("Couldn't save — please try again");
    }
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 18, margin: "0 0 4px" }}>
        {t("today_feeling_title")}
      </h2>
      <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
        {t("today_feeling_hint")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = score === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setScore(n);
                setSaved(false);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                border: `1px solid ${active ? "var(--berry)" : "var(--line)"}`,
                background: active ? "var(--berry)" : "#fff",
                color: active ? "#fff" : "var(--ink, #1e3a30)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder={t("today_feeling_placeholder")}
        rows={2}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          fontFamily: "inherit",
          fontSize: 14,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="btn"
          onClick={submit}
          disabled={score === null || saving}
          style={{ opacity: score === null || saving ? 0.6 : 1 }}
        >
          {saving ? t("saving") : t("today_feeling_save")}
        </button>
        {saved && (
          <span style={chip("rgba(20,131,78,0.12)", "var(--berry)")}>{t("today_feeling_logged")}</span>
        )}
      </div>
    </div>
  );
}

function VitalLogger({
  post,
  onSaved,
  t,
  toast,
}: {
  post: (payload: Record<string, unknown>) => Promise<boolean>;
  onSaved: () => void;
  t: (key: string) => string;
  toast: ToastApi;
}) {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (saving) return;
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) {
      setError(t("today_vital_enter_both"));
      return;
    }
    setError(null);
    setSaving(true);
    const ok = await post({ action: "log_vital", systolic: sys, diastolic: dia });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setSystolic("");
      setDiastolic("");
      toast.success(t("saved"));
      onSaved();
    } else {
      setError(t("today_vital_save_error"));
      toast.error(t("today_vital_save_error"));
    }
  }

  const inputStyle: React.CSSProperties = {
    width: 80,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--line)",
    fontFamily: "inherit",
    fontSize: 15,
    textAlign: "center",
    boxSizing: "border-box",
  };

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 18, margin: "0 0 4px" }}>
        {t("today_vital_title")}
      </h2>
      <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
        {t("today_vital_hint")}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input
          type="number"
          inputMode="numeric"
          value={systolic}
          onChange={(e) => {
            setSystolic(e.target.value);
            setSaved(false);
            setError(null);
          }}
          placeholder="120"
          aria-label="Systolic"
          style={inputStyle}
        />
        <span style={{ fontWeight: 700, color: "var(--muted, #6b7a72)" }}>/</span>
        <input
          type="number"
          inputMode="numeric"
          value={diastolic}
          onChange={(e) => {
            setDiastolic(e.target.value);
            setSaved(false);
            setError(null);
          }}
          placeholder="80"
          aria-label="Diastolic"
          style={inputStyle}
        />
        <button
          type="button"
          className="btn"
          onClick={submit}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? t("saving") : t("today_vital_save")}
        </button>
        {saved && (
          <span style={chip("rgba(20,131,78,0.12)", "var(--berry)")}>{t("today_vital_logged")}</span>
        )}
      </div>
      {error && (
        <p style={{ margin: "8px 0 0", color: "#b4231f", fontSize: 13 }}>{error}</p>
      )}
    </div>
  );
}
