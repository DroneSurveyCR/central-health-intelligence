// Server component: the /today engagement header — a streak badge, recent
// milestone chips, and ONE contextual nudge. Presentational only; all data is
// resolved server-side in page.tsx (loadEngagement). Inline styles + shared
// card/badge/muted/serif classes, matching the rest of the patient surface.

import { t, type Lang } from "@/lib/i18n/dictionary";
import type { MilestoneRow } from "@/lib/engagement/streaks";

type NudgeTone = "keep_streak" | "first" | "logged" | "sync_stale";

const NUDGE_KEY: Record<NudgeTone, string> = {
  keep_streak: "engagement_nudge_keep_streak",
  first: "engagement_nudge_first",
  logged: "engagement_nudge_logged",
  sync_stale: "engagement_nudge_sync_stale",
};

function milestoneLabel(m: MilestoneRow, lang: Lang): string {
  if (m.kind === "first_log") return t("engagement_milestone_first_log", lang);
  return m.label; // streak labels like "7-day streak" are already human + locale-neutral
}

export default function EngagementHeader({
  current,
  longest,
  milestones,
  nudge,
  lang,
}: {
  current: number;
  longest: number;
  milestones: MilestoneRow[];
  nudge: NudgeTone;
  lang: Lang;
}) {
  const hasStreak = current > 0;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Streak badge */}
        {hasStreak ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="serif"
              style={{ fontSize: 24, fontWeight: 700, color: "var(--berry)" }}
            >
              🔥 {current}
            </span>
            <span className="muted" style={{ fontSize: 14 }}>
              {t("engagement_streak_suffix", lang)}
            </span>
            {longest > current && (
              <span className="muted" style={{ fontSize: 12 }}>
                · {t("engagement_streak_longest", lang)} {longest}
              </span>
            )}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 14 }}>
            {t("engagement_streak_start", lang)}
          </div>
        )}

        {/* Recent milestones */}
        {milestones.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {milestones.map((m) => (
              <span
                key={`${m.kind}-${m.label}`}
                className="badge"
                title={t("engagement_milestones_title", lang)}
                style={{
                  background: "rgba(20,131,78,0.12)",
                  color: "var(--berry)",
                  border: "1px solid rgba(20,131,78,0.25)",
                }}
              >
                {m.kind === "first_log" ? "⭐" : "🏅"} {milestoneLabel(m, lang)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* One contextual nudge */}
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 14,
          fontWeight: nudge === "logged" ? 400 : 600,
          color: nudge === "logged" ? "var(--muted, #6b7a72)" : "var(--ink, #1e3a30)",
        }}
      >
        {t(NUDGE_KEY[nudge], lang)}
      </p>
    </div>
  );
}
