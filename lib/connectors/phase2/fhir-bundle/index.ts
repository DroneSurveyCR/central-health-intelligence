import type { ConnectorModule } from "../../types";
const notImplemented = () => { throw new Error("FHIR bundle connector is not yet implemented (Phase 2)."); };
export const fhirBundle: ConnectorModule = {
  id: "fhir_bundle", label: "HL7 FHIR Bundle", accepts: ["application/json", "application/xml"],
  targetTable: "visits", phase: "phase2",
  parse: notImplemented, confirm: notImplemented,
};
