// HealthSync Cloud — the single typed registry of modules.
// This is the source of truth that route guards, RLS gating, billing, and the
// module-driven nav all consult. Keep it a pure literal (no runtime computation).
//
// Governing principle (plan §9.0): the daily-experience intelligence layer is
// PLATFORM (always-on, free). Charge for verticals + premium connectors.

import type { ModuleDef, ModuleId } from "./types";

export const MODULES: Record<ModuleId, ModuleDef> = {
  // ---- Platform (always-on) -------------------------------------------------
  core: {
    id: "core",
    label: "Core Platform",
    price: 0,
    alwaysOn: true,
    // The EHR spine + connector engine + AI plumbing + briefing/alerting/draft loop.
    tables: [
      "patients", "practitioners", "intake_forms", "visits", "messages",
      "audit_logs", "audit_logs_ai", "files", "health_data_imports",
      "connector_registry", "practice_connectors",
    ],
  },

  // ---- Default-on, removable ------------------------------------------------
  scheduling: {
    id: "scheduling", label: "Scheduling", price: 0, defaultOn: true,
    tables: ["appointments", "waitlist_entries", "locations"],
  },
  billing: {
    id: "billing", label: "Billing", price: 0, defaultOn: true,
    tables: ["invoices", "invoice_items", "payments", "patient_insurance"],
  },
  portal: {
    id: "portal", label: "Client Portal (store & content)", price: 0, defaultOn: true,
    tables: ["products", "orders", "articles"],
  },
  engagement: {
    id: "engagement", label: "Client Engagement", price: 0, defaultOn: true,
    // streaks, milestones, nudges, the client AI assistant, plan/protocol logging.
    tables: ["progress_logs", "plan_completions"],
  },

  // ---- Data modules ---------------------------------------------------------
  labs: {
    id: "labs", label: "Lab Results", price: 39,
    includedConnectors: ["blood_lab_csv", "blood_lab_pdf", "hormone_pdf", "bioresonance_pdf"],
    addonConnectors: ["rupa_health", "labcorp_fhir", "quest_fhir"],
    tables: ["lab_results", "body_composition"],
  },
  wearables: {
    id: "wearables", label: "Device & Wearable Uploads", price: 49,
    // MVP is manual upload only: file/export connectors are included. The live-OAuth
    // providers (oura, dexcom_realtime, withings, terra) remain in code but are not
    // shipped as included connectors — gated off until/if a clinic opts into live sync.
    includedConnectors: ["apple_health", "garmin_csv", "whoop_csv", "hrv_csv"],
    addonConnectors: ["oura", "terra", "dexcom_realtime", "withings"],
    tables: ["wearable_daily_summaries", "connector_oauth_tokens"],
  },
  weight: {
    id: "weight", label: "Weight & Body Comp", price: 29,
    includedConnectors: ["withings_csv", "renpho_csv", "inbody_csv", "tanita_csv"],
    addonConnectors: ["withings"],
  },
  nutrition: {
    id: "nutrition", label: "Nutrition & Food Intake", price: 39,
    includedConnectors: ["cronometer_csv", "myfitnesspal_csv"],
    tables: ["food_logs", "supplement_logs", "nutrition_protocols"],
  },

  // ---- Verticals ------------------------------------------------------------
  rx: {
    id: "rx", label: "e-Prescribing", price: 49,
    tables: ["prescriptions"],
  },
  peptide: {
    id: "peptide", label: "Peptide & GLP-1", price: 79, dependsOn: ["rx"],
    tables: ["peptide_protocols", "peptide_administrations"],
  },
  psychedelic: {
    id: "psychedelic", label: "Plant Medicine", price: 79, dependsOn: ["labs"],
    tables: ["psychedelic_screenings", "psychedelic_sessions", "psychedelic_integration_notes"],
  },
  hrt: {
    id: "hrt", label: "Hormone Optimization (HRT/TRT)", price: 79, dependsOn: ["labs", "rx"],
    tables: ["hrt_protocols", "hrt_administrations"],
  },
  longevity: {
    id: "longevity", label: "Longevity & Biomarkers", price: 49, dependsOn: ["labs"],
    tables: ["biomarker_panels", "biological_age_scores"],
  },
  chiro: {
    id: "chiro", label: "Chiropractic (Spine Assessment)", price: 49,
    // Per-vertebra findings + overall spine conditions; renders in the 2D map and the
    // 3D viewer (admin picks 2d/3d/both per tenant via practice settings). Voice
    // annotation reuses the core transcribe endpoint. Tytron thermal is an add-on import.
    tables: ["spine_assessments"],
  },

  // ---- Operations / commerce ------------------------------------------------
  telehealth: {
    id: "telehealth", label: "Telehealth", price: 49, dependsOn: ["scheduling"],
    addonConnectors: ["daily_co", "twilio_video"],
  },
  dispensary: {
    id: "dispensary", label: "Supplement Dispensary", price: 39,
    addonConnectors: ["fullscript", "wellevate"],
  },
  reports: {
    id: "reports", label: "Reports & Exports", price: 29, dependsOn: ["billing"],
    addonConnectors: ["quickbooks", "xero"],
  },
  multisite: {
    id: "multisite", label: "Multi-Location", price: 99,
  },
  marketplace: {
    id: "marketplace", label: "Modality Marketplace", price: 49, dependsOn: ["billing"],
    tables: ["modalities", "modality_recommendations", "modality_outcomes", "modality_courses"],
  },
};

/** Modules present on every practice regardless of subscription. */
export const ALWAYS_ON: ModuleId[] = (Object.values(MODULES) as ModuleDef[])
  .filter((m) => m.alwaysOn)
  .map((m) => m.id);

/** Modules enabled by default when a new practice is created. */
export const DEFAULT_ON: ModuleId[] = (Object.values(MODULES) as ModuleDef[])
  .filter((m) => m.alwaysOn || m.defaultOn)
  .map((m) => m.id);
