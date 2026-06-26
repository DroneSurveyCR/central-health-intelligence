"use client";

import { useState } from "react";

export type BodyMapFinding = {
  region_code: string;
  system: string | null;
  severity: string | null;
  finding_text: string | null;
};

type RegionCode =
  | "head"
  | "chest"
  | "abdomen"
  | "adrenal"
  | "pelvis"
  | "arms"
  | "legs";

const SEVERITY_RANK: Record<string, number> = {
  mild: 1,
  moderate: 2,
  high: 3,
};

const SEVERITY_FILL: Record<string, string> = {
  mild: "#f4a63c", // amber
  moderate: "#ee7a4f", // clay
  high: "#c0392b", // red
};

const NEUTRAL_FILL = "#e7ddca"; // soft neutral (on-brand sand/line tone)
const NEUTRAL_STROKE = "#cdbfa6";

const REGION_LABELS: Record<RegionCode, string> = {
  head: "Head",
  chest: "Chest",
  abdomen: "Abdomen",
  adrenal: "Adrenal / Kidneys",
  pelvis: "Pelvis",
  arms: "Arms",
  legs: "Legs",
};

/** Pick the highest-severity color for a region given its findings. */
function regionFill(findings: BodyMapFinding[]): string {
  let top = 0;
  let topSeverity = "";
  for (const f of findings) {
    const rank = SEVERITY_RANK[f.severity ?? ""] ?? 0;
    if (rank > top) {
      top = rank;
      topSeverity = f.severity ?? "";
    }
  }
  return top > 0 ? SEVERITY_FILL[topSeverity] ?? NEUTRAL_FILL : NEUTRAL_FILL;
}

function SeverityPill({ severity }: { severity: string | null }) {
  const sev = severity ?? "—";
  const fill = SEVERITY_FILL[sev] ?? NEUTRAL_FILL;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "capitalize",
        color: "#fff",
        background: fill,
      }}
    >
      {sev}
    </span>
  );
}

export default function BodyMap({ findings }: { findings: BodyMapFinding[] }) {
  // Group findings by region.
  const byRegion = new Map<string, BodyMapFinding[]>();
  for (const f of findings) {
    const key = f.region_code;
    if (!key) continue;
    const arr = byRegion.get(key) ?? [];
    arr.push(f);
    byRegion.set(key, arr);
  }

  const orderedRegions: RegionCode[] = [
    "head",
    "chest",
    "abdomen",
    "adrenal",
    "pelvis",
    "arms",
    "legs",
  ];

  // Default selection: the first region that actually has a finding, else null.
  const firstFlagged =
    orderedRegions.find((r) => (byRegion.get(r)?.length ?? 0) > 0) ?? null;
  const [selected, setSelected] = useState<RegionCode | null>(firstFlagged);

  const fillFor = (r: RegionCode) => regionFill(byRegion.get(r) ?? []);
  const isSelected = (r: RegionCode) => selected === r;

  const regionProps = (r: RegionCode) => ({
    fill: fillFor(r),
    stroke: isSelected(r) ? "var(--berry)" : NEUTRAL_STROKE,
    strokeWidth: isSelected(r) ? 3 : 1,
    style: { cursor: "pointer", transition: "fill .15s, stroke .15s" },
    onClick: () => setSelected(r),
    role: "button",
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelected(r);
      }
    },
    "aria-label": REGION_LABELS[r],
  });

  const selectedFindings = selected ? byRegion.get(selected) ?? [] : [];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "flex-start",
      }}
    >
      {/* Silhouette */}
      <div
        className="card"
        style={{
          padding: 18,
          background: "var(--paper)",
          borderRadius: 16,
          flex: "0 0 auto",
        }}
      >
        <svg
          width={240}
          height={460}
          viewBox="0 0 240 460"
          role="img"
          aria-label="Interactive body map"
        >
          {/* Head */}
          <circle cx={120} cy={40} r={28} {...regionProps("head")} />
          {/* Neck */}
          <rect x={111} y={66} width={18} height={16} rx={6} fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} />

          {/* Chest (upper torso) */}
          <path
            d="M84 84 Q120 76 156 84 L150 156 Q120 164 90 156 Z"
            {...regionProps("chest")}
          />

          {/* Abdomen (mid torso) */}
          <path
            d="M90 158 Q120 166 150 158 L146 226 Q120 234 94 226 Z"
            {...regionProps("abdomen")}
          />

          {/* Adrenal / kidneys — two small shapes flanking the lower torso */}
          <ellipse cx={98} cy={200} rx={9} ry={15} {...regionProps("adrenal")} />
          <ellipse cx={142} cy={200} rx={9} ry={15} {...regionProps("adrenal")} />

          {/* Pelvis (lower torso) */}
          <path
            d="M94 228 Q120 236 146 228 L138 286 Q120 296 102 286 Z"
            {...regionProps("pelvis")}
          />

          {/* Arms — left + right */}
          <path
            d="M84 88 Q66 92 60 120 L52 210 Q50 224 64 226 Q74 224 74 210 L80 132 Z"
            {...regionProps("arms")}
          />
          <path
            d="M156 88 Q174 92 180 120 L188 210 Q190 224 176 226 Q166 224 166 210 L160 132 Z"
            {...regionProps("arms")}
          />

          {/* Legs — left + right */}
          <path
            d="M102 288 L96 420 Q96 434 110 434 Q120 432 120 418 L120 300 Z"
            {...regionProps("legs")}
          />
          <path
            d="M138 288 L144 420 Q144 434 130 434 Q120 432 120 418 L120 300 Z"
            {...regionProps("legs")}
          />
        </svg>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 12,
            flexWrap: "wrap",
            fontSize: 12,
          }}
        >
          {(["mild", "moderate", "high"] as const).map((s) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: SEVERITY_FILL[s],
                  display: "inline-block",
                }}
              />
              <span className="muted" style={{ textTransform: "capitalize" }}>{s}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ flex: "1 1 280px", minWidth: 260 }}>
        <h3 className="serif" style={{ fontSize: 20, margin: "0 0 4px" }}>
          {selected ? REGION_LABELS[selected] : "Select a region"}
        </h3>
        {!selected ? (
          <p className="muted">Tap a highlighted area to see what was found there.</p>
        ) : selectedFindings.length === 0 ? (
          <p className="muted">No findings recorded for this region.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedFindings.map((f, i) => (
              <li
                key={i}
                className="card"
                style={{ padding: 14, borderRadius: 12, background: "var(--paper)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, textTransform: "capitalize" }}>
                    {f.system ?? "General"}
                  </span>
                  <SeverityPill severity={f.severity} />
                </div>
                <p style={{ margin: 0, fontSize: 14 }}>
                  {f.finding_text ?? "No detail provided."}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
