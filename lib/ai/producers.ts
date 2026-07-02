// Shared plumbing for the doctor-side AI DRAFT PRODUCERS (app/api/ai/*).
//
// Each producer is the "AI drafts → doctor approves" entry point: it gathers
// grounded context from the patient's REAL data, asks the model for a
// SUGGESTION, and routes that suggestion through `createDraft` (status
// 'pending') so it surfaces in /approvals for a human to edit + approve.
//
// This module generalizes the access-check + context-gathering pattern that
// already lives in app/api/ai/synthesis/route.ts so the three routes don't each
// re-implement it.

import { getCurrentPractitioner } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { aiEnabled } from "@/lib/ai";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProducerGuard =
  | { ok: true; practitioner: { id: string }; patient: PatientRef }
  | { ok: false; response: NextResponse };

export type PatientRef = {
  id: string;
  first_name: string;
  last_name: string;
  sex: string | null;
};

/**
 * Gate every producer the same way: must be staff, AI must be configured,
 * caller must be under the per-practitioner AI rate limit, and the caller must
 * be able to READ the patient (RLS via the user-scoped client). Returns either
 * the resolved practitioner + patient, or a ready-to-return error response.
 */
export async function guardProducer(
  patientId: string | undefined | null,
  rateKey: string,
): Promise<ProducerGuard> {
  const me = await getCurrentPractitioner();
  if (!me)
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  if (!aiEnabled)
    return {
      ok: false,
      response: NextResponse.json({ error: "AI not enabled" }, { status: 503 }),
    };

  if (!patientId)
    return {
      ok: false,
      response: NextResponse.json({ error: "missing patientId" }, { status: 400 }),
    };

  if (!(await rateLimit(`${rateKey}:${me.id}`, 30, 3600)))
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many AI requests. Try again in an hour." },
        { status: 429 },
      ),
    };

  // RLS read: confirms this staffer may access this patient in their practice.
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name, sex")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient)
    return {
      ok: false,
      response: NextResponse.json({ error: "Patient not found" }, { status: 404 }),
    };

  return { ok: true, practitioner: { id: me.id }, patient: patient as PatientRef };
}

/** Clinical context assembled from the patient's real records, for grounding. */
export type PatientContext = {
  intake: Record<string, unknown>;
  visits: Array<{ visit_date: string | null; summary: string | null; created_at: string }>;
  labs: Array<{
    marker: string;
    value: number;
    unit: string | null;
    optimal_low: number | null;
    optimal_high: number | null;
    collected_on: string | null;
  }>;
  wearables: Array<Record<string, unknown>>;
  visitCount: number;
};

/**
 * Gather grounded context for a patient. Reads go through the service-role
 * client (after guardProducer has already verified RLS access) to avoid N+1
 * policy round-trips — same approach as the existing synthesis route.
 */
export async function gatherPatientContext(patientId: string): Promise<PatientContext> {
  const admin: SupabaseClient = createAdminClient();
  const [intakeRes, visitsRes, labsRes, wearRes, visitCountRes] = await Promise.all([
    admin
      .from("intake_forms")
      .select("form_data")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("visits")
      .select("visit_date, summary, created_at")
      .eq("patient_id", patientId)
      .is("deleted_at", null)
      .order("visit_date", { ascending: false, nullsFirst: false })
      .limit(5),
    admin
      .from("lab_results")
      .select("marker, value, unit, optimal_low, optimal_high, collected_on")
      .eq("patient_id", patientId)
      .order("collected_on", { ascending: false })
      .limit(25),
    admin
      .from("wearable_daily_summaries")
      .select(
        "date, resting_hr, hrv_ms, sleep_hours, sleep_efficiency, steps, readiness_score, spo2_avg, avg_glucose_mgdl, time_in_range_pct",
      )
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .limit(14),
    admin
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId),
  ]);

  return {
    intake: (intakeRes.data?.form_data as Record<string, unknown>) ?? {},
    visits: (visitsRes.data ?? []) as PatientContext["visits"],
    labs: (labsRes.data ?? []) as PatientContext["labs"],
    wearables: (wearRes.data ?? []) as PatientContext["wearables"],
    visitCount: visitCountRes.count ?? 0,
  };
}

/** Render the intake form's commonly-used free-text fields, defensively. */
export function intakeSummary(fd: Record<string, unknown>): {
  chiefComplaint: string;
  healthGoals: string;
  healthHistory: string;
  medications: string;
} {
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = fd[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "Not provided";
  };
  return {
    chiefComplaint: pick("chief_complaint", "reason_visit", "main_concern"),
    healthGoals: pick("health_goals", "goals"),
    healthHistory: pick("medical_history", "health_history", "past_history"),
    medications: pick("medications", "current_medications"),
  };
}

/** Format lab rows into compact, out-of-range-annotated lines for a prompt. */
export function labLines(labs: PatientContext["labs"]): string {
  if (!labs.length) return "  No labs on file";
  return labs
    .map((l) => {
      const oor =
        l.optimal_low != null && l.optimal_high != null
          ? l.value < l.optimal_low
            ? " (low)"
            : l.value > l.optimal_high
              ? " (high)"
              : ""
          : "";
      const when = l.collected_on ? ` [${l.collected_on}]` : "";
      return `  ${l.marker}: ${l.value} ${l.unit ?? ""}${oor}${when}`;
    })
    .join("\n");
}

/** Format recent wearable daily summaries into compact prompt lines. */
export function wearableLines(rows: PatientContext["wearables"]): string {
  if (!rows.length) return "  No wearable/CGM data on file";
  return rows
    .map((r) => {
      const parts: string[] = [];
      const add = (label: string, v: unknown, suffix = "") => {
        if (v != null) parts.push(`${label} ${v}${suffix}`);
      };
      add("RHR", r.resting_hr, "bpm");
      add("HRV", r.hrv_ms, "ms");
      add("sleep", r.sleep_hours, "h");
      add("sleepEff", r.sleep_efficiency, "%");
      add("steps", r.steps);
      add("readiness", r.readiness_score);
      add("SpO2", r.spo2_avg, "%");
      add("glucose", r.avg_glucose_mgdl, "mg/dL");
      add("TIR", r.time_in_range_pct, "%");
      return `  ${r.date ?? "?"}: ${parts.join(", ") || "no metrics"}`;
    })
    .join("\n");
}

/** The model id producers stamp on drafts (mirrors lib/ai.ts default). */
export const PRODUCER_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

// ── CP1: the practice knowledge base — the doctor's own recommendation universe ──
// The client assistant already grounds on the clinic's published articles (corpus B).
// The DOCTOR producers historically grounded on patient data ONLY, so their drafts
// read as generic AI rather than as THIS clinic's. gatherPracticeKnowledge() closes
// that gap: it fetches the clinic's published protocols/articles, the services &
// modalities it offers, and the product formulary it dispenses — practice-scoped via
// the RLS server client (no cross-tenant leakage) — so the model can prefer what the
// doctor actually stocks and provides.

export type PracticeKnowledge = {
  articles: Array<{ title: string; category: string | null; excerpt: string | null }>;
  services: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
};

export async function gatherPracticeKnowledge(): Promise<PracticeKnowledge> {
  const supabase = await createClient(); // RLS-scoped to the caller's practice
  const [artRes, svcRes, prodRes] = await Promise.all([
    supabase
      .from("articles")
      .select("title, category, excerpt")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .limit(40),
    supabase.from("services").select("*").order("sort_order", { ascending: true }).limit(60),
    supabase.from("products").select("*").order("name", { ascending: true }).limit(60),
  ]);
  const rows = (d: unknown): Record<string, unknown>[] => (Array.isArray(d) ? (d as Record<string, unknown>[]) : []);
  return {
    articles: rows(artRes.data) as PracticeKnowledge["articles"],
    services: rows(svcRes.data),
    products: rows(prodRes.data),
  };
}

/** Format the practice knowledge base into a compact prompt block. */
export function practiceKnowledgeBlock(kb: PracticeKnowledge): string {
  const s = (v: unknown) => (v == null ? "" : String(v));
  const line = (name: unknown, tag: unknown, desc: unknown) => {
    const t = s(tag);
    const d = s(desc);
    return `  - ${s(name)}${t ? ` [${t}]` : ""}${d ? `: ${d.slice(0, 120)}` : ""}`;
  };
  const svc = kb.services.length
    ? kb.services.slice(0, 40).map((x) => line(x.name, x.category, x.description)).join("\n")
    : "  (none listed)";
  const prod = kb.products.length
    ? kb.products.slice(0, 40).map((x) => line(x.name, x.type ?? x.category, x.description)).join("\n")
    : "  (none listed)";
  const art = kb.articles.length
    ? kb.articles.slice(0, 30).map((a) => line(a.title, a.category, a.excerpt)).join("\n")
    : "  (none published)";
  return [
    "=== THIS CLINIC'S KNOWLEDGE BASE — the doctor's own recommendation universe ===",
    "Services & modalities this clinic offers:",
    svc,
    "Products / supplement formulary this clinic dispenses:",
    prod,
    "Published clinical protocols & articles:",
    art,
  ].join("\n");
}
