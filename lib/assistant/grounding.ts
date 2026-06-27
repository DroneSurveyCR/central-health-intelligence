// HealthSync Cloud — grounded retrieval for the patient assistant.
//
// Retrieval is restricted to TWO corpora ONLY:
//   A. the patient's OWN data (labs, wearables, active plan) — read via the
//      RLS-scoped server client, so the patient can only ever see their rows.
//   B. the clinic's approved library (published `articles`).
//
// Everything else is out of scope. The result is a compact context string the
// model is told to answer strictly from, plus a few structured facts the page
// can answer locally when AI is disabled (graceful degradation).

import { createClient } from "@/lib/supabase/server";

export type GroundingFact = { label: string; value: string };

export type Grounding = {
  /** Compact text block injected into the model prompt. */
  context: string;
  /** Structured facts for the AI-disabled fallback Q&A. */
  facts: GroundingFact[];
  /** Approved article titles the patient can be pointed to. */
  articleTitles: string[];
  hasOwnData: boolean;
};

/**
 * Build grounding for a given patient. All "own data" queries run through the
 * RLS-scoped client and are filtered to `patientId` defensively.
 */
export async function buildGrounding(patientId: string): Promise<Grounding> {
  const supabase = await createClient();

  const [labRes, planRes, wearableRes, articleRes] = await Promise.all([
    // A. patient's own labs (most recent first)
    supabase
      .from("lab_results")
      .select("marker, value, unit, optimal_low, optimal_high, collected_on")
      .eq("patient_id", patientId)
      .order("collected_on", { ascending: false })
      .limit(20),
    // A. patient's own active plan
    supabase
      .from("plans")
      .select("id, title, start_date, status")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // A. patient's own latest wearable summary
    supabase
      .from("wearable_daily_summaries")
      .select("date, steps, resting_hr, sleep_hours, hrv_ms")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // B. clinic's approved library
    supabase
      .from("articles")
      .select("title, category, excerpt")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .limit(40),
  ]);

  const labs = (labRes.data ?? []) as Array<{
    marker: string;
    value: number | null;
    unit: string | null;
    optimal_low: number | null;
    optimal_high: number | null;
    collected_on: string | null;
  }>;
  const plan = planRes.data as { title: string | null; start_date: string | null } | null;
  const wearable = wearableRes.data as {
    date: string | null;
    steps: number | null;
    resting_hr: number | null;
    sleep_hours: number | null;
    hrv_ms: number | null;
  } | null;
  const articles = (articleRes.data ?? []) as Array<{
    title: string;
    category: string | null;
    excerpt: string | null;
  }>;

  const facts: GroundingFact[] = [];

  // ---- labs ----
  let labBlock = "  No labs on file.";
  if (labs.length) {
    // De-dup to the most recent reading per marker (rows are newest-first).
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const l of labs) {
      if (seen.has(l.marker)) continue;
      seen.add(l.marker);
      const flag =
        l.value != null && l.optimal_low != null && l.optimal_high != null
          ? l.value < l.optimal_low
            ? " (below your optimal range)"
            : l.value > l.optimal_high
              ? " (above your optimal range)"
              : " (within your optimal range)"
          : "";
      const line = `${l.marker}: ${l.value ?? "—"} ${l.unit ?? ""}${flag}`.trim();
      lines.push("  " + line);
      facts.push({ label: l.marker.toLowerCase(), value: line });
    }
    labBlock = lines.join("\n");
  }

  // ---- plan ----
  let planBlock = "  No active care plan on file.";
  if (plan) {
    const title = plan.title ?? "Active plan";
    const started = plan.start_date ? ` (started ${plan.start_date})` : "";
    planBlock = `  ${title}${started}.`;
    facts.push({ label: "plan", value: `${title}${started}` });
  }

  // ---- wearable ----
  let wearableBlock = "  No wearable data on file.";
  if (wearable) {
    const parts: string[] = [];
    if (wearable.steps != null) parts.push(`${wearable.steps} steps`);
    if (wearable.resting_hr != null) parts.push(`resting HR ${wearable.resting_hr} bpm`);
    if (wearable.sleep_hours != null) parts.push(`${wearable.sleep_hours} h sleep`);
    if (wearable.hrv_ms != null) parts.push(`HRV ${wearable.hrv_ms} ms`);
    if (parts.length) {
      const summary = `${parts.join(", ")}${wearable.date ? ` (on ${wearable.date})` : ""}`;
      wearableBlock = "  " + summary;
      facts.push({ label: "wearable", value: summary });
    }
  }

  // ---- approved library ----
  const articleTitles = articles.map((a) => a.title);
  const articleBlock = articles.length
    ? articles
        .slice(0, 20)
        .map((a) => `  - ${a.title}${a.excerpt ? `: ${a.excerpt}` : ""}`)
        .join("\n")
    : "  No approved articles available.";

  const context = [
    "=== PATIENT'S OWN DATA (corpus A — RLS-scoped, this patient only) ===",
    "Recent labs:",
    labBlock,
    "Active care plan:",
    planBlock,
    "Latest wearable summary:",
    wearableBlock,
    "",
    "=== CLINIC APPROVED LIBRARY (corpus B — published articles) ===",
    articleBlock,
  ].join("\n");

  const hasOwnData = labs.length > 0 || Boolean(plan) || Boolean(wearable);

  return { context, facts, articleTitles, hasOwnData };
}

/**
 * Offline (AI-disabled) grounded answer. Answers a few factual questions
 * directly from retrieved facts. Returns null when it can't answer from data —
 * the caller then shows the "AI chat isn't enabled yet" notice.
 */
export function answerFromFacts(message: string, g: Grounding): string | null {
  const q = (message ?? "").toLowerCase();

  // Plan questions
  if (/\b(plan|protocol|program)\b/.test(q)) {
    const f = g.facts.find((x) => x.label === "plan");
    return f
      ? `Your active care plan is: ${f.value}. Your care team manages the details — message the clinic for anything specific.`
      : "I don't see an active care plan on file. Your care team can set one up — message the clinic.";
  }

  // Wearable questions
  if (/\b(steps|sleep|heart rate|hrv|wearable|oura|garmin|whoop)\b/.test(q)) {
    const f = g.facts.find((x) => x.label === "wearable");
    return f
      ? `Your latest wearable summary shows: ${f.value}.`
      : "I don't see any wearable data on file yet. If you've connected a device, check the Connections page.";
  }

  // Lab questions — try to match a marker name mentioned in the question.
  if (/\b(lab|labs|result|results|marker|level|levels)\b/.test(q)) {
    const labFacts = g.facts.filter(
      (x) => x.label !== "plan" && x.label !== "wearable",
    );
    if (labFacts.length) {
      const hit = labFacts.find((x) => q.includes(x.label));
      if (hit) return `Your most recent result — ${hit.value}. Your care team interprets what this means for you.`;
      return (
        "Here are your most recent results on file:\n" +
        labFacts.map((x) => `• ${x.value}`).join("\n") +
        "\nYour care team interprets what these mean for you."
      );
    }
    return "I don't see any lab results on file yet.";
  }

  // Direct marker mention without the word "lab"
  const hit = g.facts.find(
    (x) => x.label !== "plan" && x.label !== "wearable" && q.includes(x.label),
  );
  if (hit) return `Your most recent result — ${hit.value}. Your care team interprets what this means for you.`;

  return null;
}
