"use client";

// Hand-rolled, dependency-free premium SVG charts. Responsive via viewBox.
// On-brand: berry/gold, gradient area fills, rounded bars, donut rings, sparklines.
import { useId } from "react";

const INK = "#1e3a30";
const LINE = "rgba(30,58,48,0.09)";
const MUTED = "rgba(30,58,48,0.55)";

type LinePoint = { x: string; y: number | null };

function niceBounds(min: number, max: number): { lo: number; hi: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { lo: 0, hi: 1 };
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    return { lo: min - pad, hi: max + pad };
  }
  const pad = (max - min) * 0.12;
  return { lo: min - pad, hi: max + pad };
}

export function LineChart({
  data,
  color = "var(--berry, #14834e)",
  yLabel,
  height = 200,
  series,
  area = false,
}: {
  data: LinePoint[];
  color?: string;
  yLabel?: string;
  height?: number;
  series?: { data: LinePoint[]; color: string; name?: string }[];
  area?: boolean;
}) {
  const gid = useId();
  const W = 520;
  const H = height;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 34;

  const all = [data, ...(series ?? []).map((s) => s.data)];
  const flatY = all.flatMap((d) => d.map((p) => p.y).filter((y): y is number => y != null));
  const labels = data.map((p) => p.x);
  const len = Math.max(data.length, ...all.map((d) => d.length));

  if (flatY.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" />;
  }

  const { lo, hi } = niceBounds(Math.min(...flatY), Math.max(...flatY));
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xAt = (i: number) => padL + (len <= 1 ? plotW / 2 : (i / (len - 1)) * plotW);
  const yAt = (v: number) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);

  const pathFor = (d: LinePoint[]) => {
    const segments: string[] = [];
    let penDown = false;
    d.forEach((p, i) => {
      if (p.y == null) { penDown = false; return; }
      segments.push(`${penDown ? "L" : "M"} ${xAt(i).toFixed(1)} ${yAt(p.y).toFixed(1)}`);
      penDown = true;
    });
    return segments.join(" ");
  };

  const drawn = data.map((p, i) => ({ p, i })).filter((d) => d.p.y != null);
  const areaPath = area && drawn.length > 1
    ? `${pathFor(data)} L ${xAt(drawn[drawn.length - 1].i).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xAt(drawn[0].i).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : null;

  const lines = [{ data, color, name: yLabel }, ...(series ?? [])];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={yLabel ?? "line chart"}>
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map((v, i) => {
        const y = yAt(v);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={LINE} strokeWidth={1} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill={MUTED}>{Math.round(v)}</text>
          </g>
        );
      })}
      {labels.map((lbl, i) => {
        const step = Math.ceil(labels.length / 6);
        if (i % step !== 0 && i !== labels.length - 1) return null;
        return <text key={i} x={xAt(i)} y={H - padB + 16} textAnchor="middle" fontSize={10} fill={MUTED}>{lbl}</text>;
      })}
      {yLabel && (
        <text x={12} y={padT + plotH / 2} fontSize={10} fill={MUTED} textAnchor="middle" transform={`rotate(-90 12 ${padT + plotH / 2})`}>{yLabel}</text>
      )}
      {areaPath && <path d={areaPath} fill={`url(#area-${gid})`} stroke="none" />}
      {lines.map((s, si) =>
        s.data.length > 0 ? (
          <g key={si}>
            <path d={pathFor(s.data)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {s.data.map((p, i) => (p.y == null ? null : <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r={3.2} fill="#fff" stroke={s.color} strokeWidth={2} />))}
          </g>
        ) : null,
      )}
      {series && series.length > 0 && (
        <g>
          {lines.map((s, si) => (
            <g key={si} transform={`translate(${padL + si * 96}, ${padT - 4})`}>
              <rect width={10} height={10} rx={3} fill={s.color} y={-9} />
              <text x={14} y={0} fontSize={10} fill={INK}>{s.name ?? `Series ${si + 1}`}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Gradient-area line — a single smooth trend with a soft fill. */
export function AreaChart(props: Omit<Parameters<typeof LineChart>[0], "area" | "series">) {
  return <LineChart {...props} area />;
}

export function BarChart({
  data,
  color = "var(--berry, #14834e)",
  max,
  height = 200,
}: {
  data: { label: string; value: number }[];
  color?: string;
  max?: number;
  height?: number;
}) {
  const gid = useId();
  const W = 520;
  const H = height;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 34;

  if (data.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" />;
  }

  const hi = max ?? Math.max(1, ...data.map((d) => d.value));
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const slot = plotW / data.length;
  const barW = Math.min(30, slot * 0.62);
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (hi * i) / ticks);
  const yAt = (v: number) => padT + plotH - (v / hi) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="bar chart">
      <defs>
        <linearGradient id={`bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {gridVals.map((v, i) => {
        const y = yAt(v);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={LINE} strokeWidth={1} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill={MUTED}>{Math.round(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const y = yAt(d.value);
        const h = padT + plotH - y;
        const step = Math.ceil(data.length / 7);
        const showLabel = i % step === 0 || i === data.length - 1;
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(0, h)} rx={5} fill={`url(#bar-${gid})`} />
            {showLabel && <text x={cx} y={H - padB + 16} textAnchor="middle" fontSize={10} fill={MUTED}>{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Donut / progress ring with a centered value. */
export function DonutChart({
  value,
  label,
  color = "var(--berry, #14834e)",
  size = 128,
  track = "rgba(20,131,78,0.12)",
  thickness = 11,
  centerText,
  textColor = INK,
}: {
  value: number;
  label?: string;
  color?: string;
  size?: number;
  track?: string;
  thickness?: number;
  centerText?: string;
  textColor?: string;
}) {
  const r = (size - thickness - 4) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const cx = size / 2;
  const dark = textColor !== INK;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${Math.round(pct)}% ${label ?? ""}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={track} strokeWidth={thickness} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={centerText ? cx + 1 : cx - 1} textAnchor="middle" fontSize={size * (centerText ? 0.28 : 0.24)} fontWeight={700} fill={textColor}>
        {centerText ?? `${Math.round(pct)}%`}
      </text>
      {label && (
        <text x={cx} y={cx + size * 0.18} textAnchor="middle" fontSize={size * 0.1} fill={dark ? textColor : MUTED} fillOpacity={dark ? 0.8 : 1}>
          {label}
        </text>
      )}
    </svg>
  );
}

/** Tiny inline trend line (no axes) for stat tiles / list rows. */
export function Sparkline({
  data,
  color = "var(--berry, #14834e)",
  width = 96,
  height = 30,
  fill = true,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  const gid = useId();
  const nums = data.filter((n) => Number.isFinite(n));
  if (nums.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const rng = max - min || 1;
  const xAt = (i: number) => (i / (data.length - 1)) * width;
  const yAt = (v: number) => height - 3 - ((v - min) / rng) * (height - 6);
  const line = data.map((v, i) => `${i ? "L" : "M"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#spark-${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
