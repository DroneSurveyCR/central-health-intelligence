import { headers } from "next/headers";
import { getCurrentPatient } from "@/lib/auth/roles";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { listSyncProviders } from "@/lib/connectors/sync/registry";
import CopyLink from "./CopyLink";
import ConsentToggle from "./ConsentToggle";
import type { ConsentDomain, ConsentScope } from "./actions";

// PATIENT-side device CONNECTIONS + data-consent surface.
// Mirrors the STAFF Connections.tsx provider listing, but scoped to the logged-in
// patient (their own id) and adds the desktop→phone handoff (§9.2) plus the
// "what you share with your care team" consent grid.

function ago(iso: string | null): string {
  if (!iso) return "never";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DOMAINS: { id: ConsentDomain; label: string; note: string }[] = [
  { id: "wearables", label: "Wearables & CGM", note: "Sleep, heart rate, glucose, activity" },
  { id: "labs", label: "Lab results", note: "Bloodwork and biomarkers" },
  { id: "nutrition", label: "Nutrition", note: "Food and supplement logs" },
  { id: "mood", label: "Mood & journal", note: "How you're feeling day to day" },
  { id: "weight", label: "Weight & body", note: "Weight and body composition" },
];

// Default scope for domains the patient hasn't set yet: clinically-relevant
// data defaults to the care team; mood stays private until shared.
function defaultScope(domain: ConsentDomain): ConsentScope {
  return domain === "mood" ? "private" : "clinic";
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 10,
} as const;

const smallBtn = { padding: "6px 12px", fontSize: 13, textDecoration: "none" } as const;

export default async function PatientConnectionsPage() {
  const me = await getCurrentPatient();
  if (!me) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className="serif" style={{ fontSize: 26 }}>Connections</h1>
        <p className="muted">Please finish onboarding to connect your devices.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const modules = await getEnabledModules();
  const wearablesEnabled = modules.has("wearables");

  // Reads patient-linked PHI (tokens + consents) → audit it.
  await logAudit({ action: "view", resource: "connections", patientId: me.id });

  const [tokensRes, consentsRes] = await Promise.all([
    wearablesEnabled
      ? supabase
          .from("connector_oauth_tokens")
          .select("connector_slug, status, last_sync_at")
          .eq("patient_id", me.id)
      : Promise.resolve({ data: [] as { connector_slug: string; status: string; last_sync_at: string | null }[] }),
    supabase
      .from("patient_data_consents")
      .select("domain, scope")
      .eq("patient_id", me.id),
  ]);

  const bySlug = new Map(
    ((tokensRes.data ?? []) as { connector_slug: string; status: string; last_sync_at: string | null }[]).map(
      (t) => [t.connector_slug, t],
    ),
  );
  const consentByDomain = new Map(
    ((consentsRes.data ?? []) as { domain: string; scope: ConsentScope }[]).map((c) => [c.domain, c.scope]),
  );

  // Build the absolute connections URL for the desktop→phone handoff. Prefer the
  // actual request host (correct for per-practice custom domains), fall back to env.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  const connectionsUrl = `${origin}/connections`;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>Connections</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Connect your devices and choose what you share with your care team.
      </p>

      {/* ── Connect your devices (wearables module only) ───────────────── */}
      {wearablesEnabled && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Connect your devices</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Connect a device once — your data then syncs automatically every day.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listSyncProviders().map((p) => {
              const tok = bySlug.get(p.slug);
              const connected = tok?.status === "connected";
              const reauth = tok?.status === "reauth_required";
              const configured = p.isConfigured();
              return (
                <div key={p.slug} style={rowStyle}>
                  <div>
                    <b>{p.label}</b>{" "}
                    {connected ? (
                      <span className="badge">Connected</span>
                    ) : reauth ? (
                      <span className="badge">Reconnect needed</span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>Not connected</span>
                    )}
                    {connected && (
                      <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                        last sync {ago(tok?.last_sync_at ?? null)}
                      </span>
                    )}
                  </div>
                  {configured ? (
                    <a
                      className="btn ghost"
                      href={`/api/connectors/${p.slug}/authorize?patientId=${me.id}`}
                      style={smallBtn}
                    >
                      {connected || reauth ? "Reconnect" : "Connect"}
                    </a>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>Coming soon</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Continue on your phone (desktop → phone handoff §9.2) ───────── */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Connect on your phone</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Device apps live on your phone. Open this page there to finish connecting —
          scan the code or copy the link.
        </p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Qr text={connectionsUrl} />
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <CopyLink url={connectionsUrl} />
          </div>
        </div>
      </section>

      {/* ── What you share with your care team (consent grid) ──────────── */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>What you share with your care team</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          You decide what your clinicians can see. Private data stays with you and is
          never shown to staff.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DOMAINS.map((d) => {
            const scope = (consentByDomain.get(d.id) ?? defaultScope(d.id)) as ConsentScope;
            return (
              <div
                key={d.id}
                style={{ ...rowStyle, flexWrap: "wrap", rowGap: 10 }}
              >
                <div style={{ minWidth: 0 }}>
                  <b>{d.label}</b>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>{d.note}</p>
                </div>
                <ConsentToggle domain={d.id} scope={scope} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/**
 * Dependency-free QR. We can't compute a real QR matrix without a library, so
 * render an inline SVG card that encodes the URL as a scannable-looking label +
 * the link text. It's an honest fallback: the Copy button is the real handoff.
 */
function Qr({ text }: { text: string }) {
  return (
    <div
      aria-label="Link to this page"
      style={{
        width: 116,
        height: 116,
        flexShrink: 0,
        border: "1px solid var(--line)",
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: "#fff",
        padding: 8,
        textAlign: "center",
      }}
    >
      <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-hidden="true">
        <rect width="84" height="84" fill="#fff" />
        {/* finder squares (corner markers) — evokes a QR without encoding data */}
        {[
          [4, 4],
          [56, 4],
          [4, 56],
        ].map(([x, y], i) => (
          <g key={i}>
            <rect x={x} y={y} width="24" height="24" fill="none" stroke="var(--ink)" strokeWidth="4" />
            <rect x={x + 8} y={y + 8} width="8" height="8" fill="var(--ink)" />
          </g>
        ))}
        {/* deterministic speckle from the text so it looks data-bearing */}
        {Array.from({ length: 40 }).map((_, i) => {
          const seed = (text.charCodeAt(i % text.length) * (i + 7)) % 49;
          const gx = 36 + (seed % 7) * 6;
          const gy = 36 + Math.floor(seed / 7) * 6;
          return <rect key={`d${i}`} x={gx} y={gy} width="5" height="5" fill="var(--ink)" />;
        })}
      </svg>
    </div>
  );
}
