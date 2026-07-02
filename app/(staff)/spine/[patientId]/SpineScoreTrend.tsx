import { scoreBand } from "@/lib/spine/score";

const BAND_HEX: Record<string, string> = {
  excellent: "#14834e",
  good: "#6fae84",
  fair: "#f4a63c",
  guarded: "#ee7a4f",
  poor: "#c0392b",
};

/** Sparkline of the alignment score across past assessments (chronological). */
export default function SpineScoreTrend({ points }: { points: { date: string; score: number }[] }) {
  if (points.length === 0) return null;
  const latest = points[points.length - 1];

  if (points.length < 2) {
    return (
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Alignment score trend</h2>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          First assessment scored{" "}
          <b style={{ color: BAND_HEX[scoreBand(latest.score)] }}>{latest.score}</b>. The trend line appears
          after the next visit.
        </p>
      </section>
    );
  }

  const delta = latest.score - points[0].score;
  const W = 520;
  const H = 120;
  const pad = 24;
  const xs = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const ys = (s: number) => pad + (1 - s / 100) * (H - 2 * pad);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.score).toFixed(1)}`).join(" ");

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 className="serif" style={{ fontSize: 19, margin: 0 }}>Alignment score trend</h2>
        <span className="muted" style={{ fontSize: 13 }}>{points.length} assessments</span>
        <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: delta >= 0 ? "#14834e" : "#c0392b" }}>
          {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : ""}{delta} since first
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: 560, marginTop: 8, display: "block" }}
        role="img"
        aria-label={`Alignment score over ${points.length} assessments, latest ${latest.score} of 100`}
      >
        {[0, 25, 50, 75, 100].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={ys(g)} y2={ys(g)} stroke="var(--line, #ece1ce)" strokeWidth={0.75} />
        ))}
        <path d={path} fill="none" stroke="#1f2937" strokeWidth={2} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xs(i)}
            cy={ys(p.score)}
            r={i === points.length - 1 ? 4.5 : 3}
            fill={BAND_HEX[scoreBand(p.score)]}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
        <text
          x={xs(points.length - 1)}
          y={ys(latest.score) - 9}
          textAnchor="end"
          fontSize="12"
          fontWeight="700"
          fill={BAND_HEX[scoreBand(latest.score)]}
        >
          {latest.score}
        </text>
      </svg>
    </section>
  );
}
