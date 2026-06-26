import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import {
  summarizePerMarker,
  groupByCategory,
  type LabResult,
} from "@/lib/labs/helpers";
import { MarkerCard } from "@/lib/labs/components";

export default async function PatientLabsPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();

  // RLS scopes this to the patient's own rows (self-read).
  const { data } = await supabase
    .from("lab_results")
    .select(
      "id, patient_id, marker, value, unit, optimal_low, optimal_high, category, collected_on, created_at",
    )
    .eq("patient_id", me.id)
    .order("collected_on", { ascending: true });

  await logAudit({ action: "view", resource: "lab_results", patientId: me.id });

  const rows = (data ?? []) as LabResult[];
  const summaries = summarizePerMarker(rows);
  const groups = groupByCategory(summaries);

  // Full chronological reading values per marker (rows are already ordered by
  // collected_on ascending) — drives the per-marker trend sparkline.
  const readingsByMarker = new Map<string, number[]>();
  for (const r of rows) {
    if (typeof r.value !== "number" || !Number.isFinite(r.value)) continue;
    const list = readingsByMarker.get(r.marker) ?? [];
    list.push(r.value);
    readingsByMarker.set(r.marker, list);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {t("labs_title", lang)}
      </h1>
      <p className="muted" style={{ maxWidth: 560 }}>
        {t("labs_intro", lang)}
      </p>

      {groups.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>{t("labs_empty", lang)}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.category} style={{ marginTop: 24 }}>
            <h2
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "var(--berry)",
                margin: "0 0 10px",
              }}
            >
              {g.category}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {g.markers.map((m) => (
                <MarkerCard
                  key={m.marker}
                  m={m}
                  lang={lang}
                  readings={readingsByMarker.get(m.marker) ?? []}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
