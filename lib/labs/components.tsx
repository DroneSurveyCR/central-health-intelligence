import { t, type Lang } from "@/lib/i18n/dictionary";
import {
  rangeBarPosition,
  type MarkerSummary,
} from "@/lib/labs/helpers";
import { Sparkline } from "@/lib/charts/Charts";

const BERRY = "#14834e";
const RUST = "#e0613b";

/**
 * Renders a single marker: name, latest value, status chip, hand-rolled range
 * bar (optimal band as a green segment, value as a dot), optimal-range text,
 * and the trend vs the previous reading.
 */
export function MarkerCard({
  m,
  lang,
  readings = [],
}: {
  m: MarkerSummary;
  lang: Lang;
  readings?: number[];
}) {
  const inRange = m.status === "optimal";
  const statusColor = inRange ? BERRY : RUST;
  const statusKey =
    m.status === "optimal"
      ? "labs_status_optimal"
      : m.status === "below"
        ? "labs_status_below"
        : "labs_status_above";

  const pos = rangeBarPosition(m.latest.value, m.optimal_low, m.optimal_high);
  const bandLeft = Math.min(pos.bandLowPct, pos.bandHighPct);
  const bandWidth = Math.abs(pos.bandHighPct - pos.bandLowPct);

  const trendColor =
    m.trend === "improving"
      ? BERRY
      : m.trend === "worsening"
        ? RUST
        : "var(--muted, #6b7c74)";
  const trendArrow =
    m.trend === "improving" ? "↑" : m.trend === "worsening" ? "↓" : "→";
  const trendKey =
    m.trend === "improving"
      ? "labs_trend_improving"
      : m.trend === "worsening"
        ? "labs_trend_worsening"
        : "labs_trend_flat";

  const rangeText =
    m.optimal_low != null && m.optimal_high != null
      ? `${m.optimal_low}–${m.optimal_high}${m.unit ? ` ${m.unit}` : ""}`
      : m.optimal_low != null
        ? `≥ ${m.optimal_low}${m.unit ? ` ${m.unit}` : ""}`
        : m.optimal_high != null
          ? `≤ ${m.optimal_high}${m.unit ? ` ${m.unit}` : ""}`
          : "—";

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{m.marker}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>
            {m.latest.value}
            {m.unit ? (
              <span
                className="muted"
                style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}
              >
                {m.unit}
              </span>
            ) : null}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background: statusColor,
            borderRadius: 999,
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {t(statusKey, lang)}
        </span>
      </div>

      {/* Range bar: track + optimal band segment + value marker */}
      <div style={{ margin: "14px 0 8px" }}>
        <div
          style={{
            position: "relative",
            height: 10,
            borderRadius: 999,
            background: "var(--sand, #efe9df)",
            border: "1px solid var(--line)",
          }}
        >
          {/* optimal band (green segment) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${bandLeft}%`,
              width: `${bandWidth}%`,
              background: "rgba(20,131,78,0.28)",
              borderLeft: `2px solid ${BERRY}`,
              borderRight: `2px solid ${BERRY}`,
              borderRadius: 4,
            }}
          />
          {/* value marker (dot) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${pos.valuePct}%`,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: statusColor,
              border: "2px solid var(--paper, #fff)",
              boxShadow: "0 1px 3px rgba(30,58,48,0.3)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 8,
          }}
        >
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            {t("labs_optimal_range", lang)}: {rangeText}
          </p>
          {readings.length >= 2 ? (
            <Sparkline
              data={readings}
              color={m.trend === "worsening" ? RUST : BERRY}
              width={108}
              height={30}
            />
          ) : null}
        </div>
      </div>

      {/* Trend */}
      {m.previous ? (
        <p style={{ margin: "6px 0 0", fontSize: 13 }}>
          <span style={{ color: trendColor, fontWeight: 600 }}>
            {trendArrow} {t(trendKey, lang)}
          </span>
          <span className="muted">
            {" — "}
            {t("labs_previous", lang)}: {m.previous.value}
            {m.unit ? ` ${m.unit}` : ""}
            {" · "}
            {fmtDate(m.previous.collected_on ?? m.previous.created_at, lang)}
          </span>
        </p>
      ) : (
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
          {t("labs_no_previous", lang)}
        </p>
      )}
    </div>
  );
}

export function fmtDate(iso: string, lang: Lang) {
  try {
    return new Date(iso).toLocaleDateString(
      lang === "es" ? "es-CR" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );
  } catch {
    return iso;
  }
}
