// Presentational: a compact "what changed since last visit" block for the
// focus page. No data fetching here — the server page passes computed values.

export type BriefingView = {
  summary: string;
  deltas: string[];
  talkingPoints: string[];
  cached: boolean;
};

export default function Briefing({ briefing }: { briefing: BriefingView | null }) {
  if (!briefing) return null;

  const { summary, deltas, talkingPoints, cached } = briefing;

  return (
    <section
      className="card"
      style={{ marginTop: 18, maxWidth: 760, background: "var(--paper)" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 className="serif" style={{ fontSize: 19, margin: 0 }}>
          Since last visit
        </h2>
        <span className="muted" style={{ fontSize: 12 }}>
          {cached ? "Morning briefing" : "Computed just now"}
        </span>
      </div>

      <p style={{ marginTop: 8, marginBottom: 0 }}>{summary}</p>

      {deltas.length > 0 && (
        <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          {deltas.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}

      {talkingPoints.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Talking points
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {talkingPoints.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: 14,
                }}
              >
                <span className="badge" style={{ flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 12, marginBottom: 0 }}>
        Rule-based summary of recent metrics. Not diagnostic — clinician review required.
      </p>
    </section>
  );
}
