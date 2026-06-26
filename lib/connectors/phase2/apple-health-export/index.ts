import type { ConnectorModule } from "../../types";
const notImplemented = () => { throw new Error("Apple Health export connector is not yet implemented (Phase 2)."); };
export const appleHealthExport: ConnectorModule = {
  id: "apple_health_export", label: "Apple Health Export", accepts: ["application/zip", "text/xml"],
  targetTable: "lab_results", phase: "phase2",
  parse: notImplemented, confirm: notImplemented,
};
