"use client";

import { VERTEBRAE, SEVERITY_HEX, type SpineSeverity } from "@/lib/spine/schema";

// Gentle per-region x-offset to suggest the sagittal curves without pretending
// to be a true lateral radiograph.
const REGION_DX: Record<string, number> = { cervical: 8, thoracic: -7, lumbar: 10, sacral: 3 };
const REGION_W: Record<string, number> = { cervical: 50, thoracic: 62, lumbar: 74, sacral: 82 };
const REGION_LABEL: Record<string, string> = {
  cervical: "Cervical",
  thoracic: "Thoracic",
  lumbar: "Lumbar",
  sacral: "Sacral",
};

/** Presentational clickable spine. Colours each vertebra by its current severity. */
export default function SpineColumn({
  severityByCode,
  selected,
  onSelect,
}: {
  severityByCode: Record<string, SpineSeverity>;
  selected: string;
  onSelect: (code: string) => void;
}) {
  const W = 250;
  const rowH = 19;
  const gap = 3;
  const padTop = 10;
  const CX = 165;
  const height = padTop * 2 + VERTEBRAE.length * (rowH + gap);
  const yOf = (i: number) => padTop + i * (rowH + gap);

  // contiguous region groups for the left-gutter labels + bracket
  const groups: { region: string; i0: number; i1: number }[] = [];
  VERTEBRAE.forEach((v, i) => {
    const last = groups[groups.length - 1];
    if (last && last.region === v.region) last.i1 = i;
    else groups.push({ region: v.region, i0: i, i1: i });
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      style={{ maxWidth: 280, display: "block" }}
      role="img"
      aria-label="Spine — select a vertebra to document findings"
    >
      {groups.map((g) => {
        const yTop = yOf(g.i0);
        const yBot = yOf(g.i1) + rowH;
        const yMid = (yTop + yBot) / 2;
        return (
          <g key={g.region}>
            <line x1={72} y1={yTop + 1} x2={72} y2={yBot - 1} stroke="var(--line, #ece1ce)" strokeWidth={1.5} />
            <text x={64} y={yMid + 3.5} textAnchor="end" fontSize="10.5" fill="#7b8a7e" style={{ userSelect: "none" }}>
              {REGION_LABEL[g.region]}
            </text>
          </g>
        );
      })}
      {VERTEBRAE.map((v, i) => {
        const y = yOf(i);
        const sev = severityByCode[v.id] ?? "normal";
        const fill = SEVERITY_HEX[sev];
        const cx = CX + (REGION_DX[v.region] ?? 0);
        const bw = REGION_W[v.region] ?? 56;
        const isSel = selected === v.id;
        return (
          <g key={v.id} onClick={() => onSelect(v.id)} style={{ cursor: "pointer" }}>
            <rect
              x={cx - bw / 2}
              y={y}
              width={bw}
              height={rowH}
              rx={6}
              fill={fill}
              stroke={isSel ? "var(--ink, #1f2937)" : "rgba(31,41,55,0.16)"}
              strokeWidth={isSel ? 2.5 : 1}
            />
            <text
              x={cx}
              y={y + rowH / 2 + 3.5}
              textAnchor="middle"
              fontSize="10"
              fontWeight={isSel ? 700 : 500}
              fill={sev === "normal" ? "#5b6b60" : "#20140f"}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {v.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
