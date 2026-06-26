import type { ConnectorModule } from "../../types";
const notImplemented = () => { throw new Error("Garmin API connector is not yet implemented (Phase 2)."); };
export const garminApi: ConnectorModule = {
  id: "garmin_api", label: "Garmin Connect", accepts: ["application/json"],
  targetTable: "lab_results", phase: "phase2",
  parse: notImplemented, confirm: notImplemented,
};
