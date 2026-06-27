import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// PUBLIC per-clinic landing page — NO AUTH.
// Resolves a practice by slug via the service-role admin client and renders
// ONLY non-PHI public branding: name, tagline/about, and a public services list.
// NEVER reads or exposes patient data. The middleware `isPublic` list allows
// `/p/` so this is reachable without a session.
// ---------------------------------------------------------------------------

type PublicService = { name: string; description?: string | null };

type PublicPractice = {
  name: string;
  vertical: string | null;
  settings: Record<string, unknown>;
};

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readServices(settings: Record<string, unknown>): PublicService[] {
  const raw = settings["services"] ?? settings["public_services"];
  if (!Array.isArray(raw)) return [];
  const out: PublicService[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ name: item.trim() });
    } else if (item && typeof item === "object") {
      const name = readString((item as Record<string, unknown>).name);
      if (name) {
        out.push({
          name,
          description: readString((item as Record<string, unknown>).description),
        });
      }
    }
  }
  return out;
}

export default async function PublicClinicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Admin (service-role) read, tightly scoped to safe public columns + this slug only.
  const admin = createAdminClient();
  const { data } = await admin
    .from("practices")
    .select("name, vertical, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  const practice = data as PublicPractice;
  const settings = (practice.settings ?? {}) as Record<string, unknown>;

  const tagline =
    readString(settings["tagline"]) ?? readString(settings["headline"]);
  const about = readString(settings["about"]) ?? readString(settings["description"]);
  const services = readServices(settings);

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* Hero */}
      <section
        style={{
          padding: "72px 24px 48px",
          maxWidth: 840,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1 className="serif" style={{ fontSize: 40, margin: "0 0 12px" }}>
          {practice.name}
        </h1>
        {tagline && (
          <p
            className="muted"
            style={{ fontSize: 18, margin: "0 auto 28px", maxWidth: 560 }}
          >
            {tagline}
          </p>
        )}
        <a
          className="btn"
          href="/login"
          style={{ display: "inline-block", padding: "12px 28px", fontSize: 15 }}
        >
          Book / Patient login
        </a>
      </section>

      {/* About */}
      {about && (
        <section
          style={{ padding: "0 24px 48px", maxWidth: 720, margin: "0 auto" }}
        >
          <div className="card" style={{ padding: 28 }}>
            <h2 className="serif" style={{ marginTop: 0 }}>
              About
            </h2>
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {about}
            </p>
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section
          style={{ padding: "0 24px 64px", maxWidth: 720, margin: "0 auto" }}
        >
          <h2 className="serif" style={{ textAlign: "center" }}>
            Services
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {services.map((s, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <strong>{s.name}</strong>
                {s.description && (
                  <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
                    {s.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section
        style={{
          padding: "0 24px 72px",
          maxWidth: 720,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <a className="btn ghost" href="/login" style={{ display: "inline-block" }}>
          Patient login
        </a>
      </section>
    </main>
  );
}
