// HealthSync Cloud — module system types.
// A module is a self-contained, purchasable feature set gated by `practices.modules`.
// The PLATFORM (always-on) is represented by `core`; everything else is gated.

export type ModuleId =
  | "core"          // always-on EHR spine: records, intake, SOAP, messaging, audit, connector engine, AI plumbing
  | "scheduling"    // calendar, appointments, waitlist, reminders
  | "billing"       // invoices, payments, superbills, insurance
  | "portal"        // slim patient commerce/content: store, orders, memberships, learn
  | "engagement"    // patient retention engine: streaks, milestones, nudges, /assistant, protocol logging
  | "labs"          // structured lab/biomarker panels
  | "wearables"     // wearables + CGM (Oura, Garmin, Whoop, Dexcom, Apple Health, Terra)
  | "weight"        // smart-scale + body-composition tracking
  | "nutrition"     // food + supplement logging
  | "peptide"       // peptide/GLP-1 protocols + titration
  | "psychedelic"   // plant-medicine: screening, sessions, integration
  | "hrt"           // hormone optimization (TRT + women's HRT)
  | "rx"            // e-prescribing (PDF script v1 -> Surescripts -> EPCS)
  | "telehealth"    // real embedded video
  | "dispensary"    // supplement dispensary (Fullscript/Wellevate)
  | "longevity"     // biomarker timeline + biological age
  | "reports"       // finance + patient reports, QuickBooks/Xero export
  | "multisite"     // multi-location
  | "marketplace";  // modality marketplace + outcomes engine (Part 10)

export interface ModuleDef {
  id: ModuleId;
  label: string;
  /** Monthly add-on price in USD. 0 = platform or default-on (included). */
  price: number;
  /** Always present; cannot be disabled. */
  alwaysOn?: boolean;
  /** Enabled by default on a new practice but removable. */
  defaultOn?: boolean;
  /** Hard dependencies — auto-enabled at checkout and required at runtime. */
  dependsOn?: ModuleId[];
  /** Connectors bundled FREE with this module. */
  includedConnectors?: string[];
  /** Premium connectors purchasable a-la-carte under this module (vendor-fee bearing). */
  addonConnectors?: string[];
  /** DB tables owned by this module (for RLS module-gating + unsubscribe lifecycle). */
  tables?: string[];
}
