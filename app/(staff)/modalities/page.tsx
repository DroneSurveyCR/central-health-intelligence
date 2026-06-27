import { requireStaff, getCurrentPractitioner } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import AddModalityForm from "./AddModalityForm";

type Modality = {
  id: string;
  practice_id: string | null;
  name: string;
  category: string | null;
  indications: string[] | null;
  target_markers: string[] | null;
  evidence_level: string | null;
  contraindications: string[] | null;
  typical_cost: number | null;
  typical_duration: string | null;
};

const EVIDENCE_COLORS: Record<string, string> = {
  established: "var(--berry, #6b3f69)",
  observational: "var(--muted)",
  emerging: "var(--muted)",
};

export default async function ModalitiesMenuPage() {
  await requireStaff();
  await requireModule("marketplace");
  await getCurrentPractitioner();

  const supabase = await createClient();

  // RLS returns global rows (practice_id null) + this practice's own rows.
  const { data } = await supabase
    .from("modalities")
    .select(
      "id, practice_id, name, category, indications, target_markers, evidence_level, contraindications, typical_cost, typical_duration",
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const modalities = (data ?? []) as Modality[];

  // Group by category for a tidy menu.
  const byCategory = new Map<string, Modality[]>();
  for (const m of modalities) {
    const key = m.category ?? "other";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(m);
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
        Modality marketplace
      </h1>
      <p className="muted">
        Your clinic&apos;s menu of modalities. Global entries are shared across
        the platform; your custom entries are private to this practice.
      </p>

      <div
        className="card"
        style={{ marginTop: 8, background: "var(--bg-soft, #faf7fa)" }}
      >
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Evidence levels describe how much published support a modality has —
          they are not efficacy claims. Outcomes recorded per patient are
          observational, personal-response data, not generalizable results.
        </p>
      </div>

      <div style={{ marginTop: 18 }}>
        <AddModalityForm />
      </div>

      {modalities.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>
            No modalities yet. Seed the global catalogue or add a clinic
            modality above.
          </p>
        </div>
      ) : (
        Array.from(byCategory.entries()).map(([category, items]) => (
          <section key={category} style={{ marginTop: 22 }}>
            <h2
              className="serif"
              style={{ fontSize: 18, margin: "0 0 10px", textTransform: "capitalize" }}
            >
              {category}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((m) => (
                <div key={m.id} className="card" style={{ margin: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 16, flex: 1 }}>{m.name}</h3>
                    {m.evidence_level && (
                      <span
                        className="badge"
                        style={{
                          background: EVIDENCE_COLORS[m.evidence_level] ?? "var(--muted)",
                        }}
                      >
                        {m.evidence_level}
                      </span>
                    )}
                    <span className="badge muted">
                      {m.practice_id ? "clinic" : "global"}
                    </span>
                  </div>

                  <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    {m.typical_cost != null ? `$${m.typical_cost}` : "cost n/a"}
                    {m.typical_duration ? ` · ${m.typical_duration}` : ""}
                  </p>

                  {m.indications && m.indications.length > 0 && (
                    <p style={{ fontSize: 14, margin: "6px 0 0" }}>
                      <strong>May be considered for:</strong>{" "}
                      {m.indications.join(", ")}
                    </p>
                  )}
                  {m.target_markers && m.target_markers.length > 0 && (
                    <p style={{ fontSize: 14, margin: "4px 0 0" }}>
                      <strong>Tracked markers:</strong>{" "}
                      {m.target_markers.join(", ")}
                    </p>
                  )}
                  {m.contraindications && m.contraindications.length > 0 && (
                    <p
                      style={{ fontSize: 13, margin: "6px 0 0", color: "var(--danger, #b3261e)" }}
                    >
                      <strong>Cautions:</strong> {m.contraindications.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
