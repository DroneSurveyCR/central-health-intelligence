import { createClient } from "@/lib/supabase/server";
import { listSyncProviders } from "@/lib/connectors/sync/registry";

// Live device connections (OAuth-pull). Connect once → the daily sync cron pulls
// normalized summaries into wearable_daily_summaries. The sandbox provider works
// with no external credentials, so this is demoable end-to-end immediately.

function ago(iso: string | null): string {
  if (!iso) return "never";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

export default async function Connections({ patientId }: { patientId: string }) {
  const supabase = await createClient();
  const { data: tokens } = await supabase
    .from("connector_oauth_tokens")
    .select("connector_slug, status, last_sync_at")
    .eq("patient_id", patientId);
  const bySlug = new Map((tokens ?? []).map((t) => [t.connector_slug as string, t]));

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>Live connections</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Connect a device once — data then syncs automatically every day.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {listSyncProviders().map((p) => {
          const tok = bySlug.get(p.slug) as { status?: string; last_sync_at?: string | null } | undefined;
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
                  href={`/api/connectors/${p.slug}/authorize?patientId=${patientId}`}
                  style={smallBtn}
                >
                  {connected || reauth ? "Reconnect" : "Connect"}
                </a>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>Not configured yet</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
