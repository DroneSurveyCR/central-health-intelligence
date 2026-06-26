import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../../types";

const OURA_BASE = "https://api.ouraring.com/v2/usercollection";

interface OuraSleep { day: string; score?: number; contributors?: { deep_sleep?: number; efficiency?: number; latency?: number; rem_sleep?: number; restfulness?: number; timing?: number; total_sleep?: number } }
interface OuraReadiness { day: string; score?: number; hrv_balance_score?: number; recovery_index_score?: number; resting_heart_rate_score?: number; temperature_deviation?: number }
interface OuraActivity { day: string; score?: number; steps?: number; active_calories?: number; total_calories?: number }

async function ouraFetch<T>(endpoint: string, token: string, start: string, end: string): Promise<T[]> {
  const url = `${OURA_BASE}/${endpoint}?start_date=${start}&end_date=${end}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Oura API error ${res.status} on ${endpoint}`);
  const json = await res.json() as { data: T[] };
  return json.data ?? [];
}

export const ouraApi: ConnectorModule = {
  id: "oura_api",
  label: "Oura Ring (API)",
  // Staff uploads a JSON credentials file: { "token": "...", "start_date": "2024-01-01", "end_date": "2024-12-31" }
  accepts: ["application/json", "text/plain"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    let creds: { token?: string; start_date?: string; end_date?: string };
    try {
      creds = JSON.parse(input.fileBuffer.toString("utf-8"));
    } catch {
      throw new Error("File must be a JSON object: { \"token\": \"...\", \"start_date\": \"YYYY-MM-DD\", \"end_date\": \"YYYY-MM-DD\" }");
    }
    if (!creds.token) throw new Error("Missing 'token' in credentials file.");
    if (!creds.start_date || !creds.end_date) throw new Error("Missing 'start_date' or 'end_date'.");

    const [sleepData, readinessData, activityData] = await Promise.all([
      ouraFetch<OuraSleep>("daily_sleep", creds.token, creds.start_date, creds.end_date),
      ouraFetch<OuraReadiness>("daily_readiness", creds.token, creds.start_date, creds.end_date),
      ouraFetch<OuraActivity>("daily_activity", creds.token, creds.start_date, creds.end_date),
    ]);

    const rows: Record<string, unknown>[] = [];
    const base = { unit: "score", optimal_low: 70, optimal_high: 100, category: "Wearable (Oura)" };

    for (const s of sleepData) {
      if (s.score != null) rows.push({ ...base, collected_on: s.day, marker: "Oura Sleep Score", value: s.score });
      if (s.contributors?.deep_sleep != null) rows.push({ ...base, collected_on: s.day, marker: "Oura Deep Sleep Score", value: s.contributors.deep_sleep });
      if (s.contributors?.rem_sleep != null) rows.push({ ...base, collected_on: s.day, marker: "Oura REM Sleep Score", value: s.contributors.rem_sleep });
      if (s.contributors?.efficiency != null) rows.push({ ...base, collected_on: s.day, marker: "Oura Sleep Efficiency", value: s.contributors.efficiency });
    }
    for (const r of readinessData) {
      if (r.score != null) rows.push({ ...base, collected_on: r.day, marker: "Oura Readiness Score", value: r.score });
      if (r.hrv_balance_score != null) rows.push({ ...base, collected_on: r.day, marker: "Oura HRV Balance", value: r.hrv_balance_score });
      if (r.recovery_index_score != null) rows.push({ ...base, collected_on: r.day, marker: "Oura Recovery Index", value: r.recovery_index_score });
      if (r.temperature_deviation != null) rows.push({ ...base, collected_on: r.day, marker: "Oura Temperature Deviation", value: Math.round(r.temperature_deviation * 100) / 100, unit: "°C", optimal_low: -0.5, optimal_high: 0.5 });
    }
    for (const a of activityData) {
      if (a.score != null) rows.push({ ...base, collected_on: a.day, marker: "Oura Activity Score", value: a.score });
      if (a.steps != null) rows.push({ ...base, collected_on: a.day, marker: "Oura Steps", value: a.steps, unit: "steps", optimal_low: 7500, optimal_high: 15000 });
    }

    const days = new Set(rows.map((r) => r.collected_on as string)).size;
    return {
      rows,
      summary: `${days} days of Oura data (${sleepData.length} sleep · ${readinessData.length} readiness · ${activityData.length} activity).`,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const inserts = rows.map((r) => ({ ...r, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
