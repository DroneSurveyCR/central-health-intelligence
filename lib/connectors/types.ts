export type ConnectorId =
  | "bioresonance_pdf"
  | "blood_lab_pdf"
  | "blood_lab_csv"
  | "body_composition_csv"
  | "imaging_pdf"
  | "noterro_csv"
  | "generic_pdf"
  | "generic_image"
  | "hormone_pdf"
  | "cgm_csv"
  | "microbiome_pdf"
  | "garmin_csv"
  | "whoop_csv"
  | "hrv_csv"
  | "nutrition_csv"
  | "oura_api"
  | "garmin_api"
  | "apple_health_export"
  | "fhir_bundle";

export type TargetTable =
  | "scans"
  | "lab_results"
  | "body_composition"
  | "files"
  | "patients"
  | "visits";

export interface ParseResult {
  rows: Record<string, unknown>[];
  summary?: string;
  warnings?: string[];
  rawText?: string;
}

export interface ParseInput {
  fileBuffer: Buffer;
  mimeType: string;
  originalFileName: string;
  patient: { id: string; firstName: string; lastName: string; dob?: string; sex?: string };
  connectorConfig: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseClient = any;

export interface ConnectorModule {
  readonly id: ConnectorId;
  readonly label: string;
  readonly accepts: string[];
  readonly targetTable: TargetTable;
  readonly phase: "mvp" | "phase2";

  parse(input: ParseInput): Promise<ParseResult>;
  confirm(
    rows: Record<string, unknown>[],
    importId: string,
    patientId: string,
    adminClient: AnySupabaseClient,
    // The caller's practice. Connectors that insert tenant-root rows (e.g. patients) MUST scope
    // dedup + writes by this. Per-patient connectors key off the already-scoped patientId and may ignore it.
    practiceId?: string,
  ): Promise<string[]>;
  pull?: (
    patientId: string,
    credentials: Record<string, string>,
    since?: Date,
  ) => Promise<ParseResult>;
}
