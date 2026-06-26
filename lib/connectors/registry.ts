import type { ConnectorModule, ConnectorId } from "./types";
import { bioresonancePdf }    from "./bioresonance-pdf";
import { bloodLabPdf }        from "./blood-lab-pdf";
import { bloodLabCsv }        from "./blood-lab-csv";
import { bodyCompositionCsv } from "./body-composition-csv";
import { imagingPdf }         from "./imaging-pdf";
import { noterrocsv }         from "./noterro-csv";
import { genericPdf }         from "./generic-pdf";
import { genericImage }       from "./generic-image";
import { hormonePdf }         from "./hormone-pdf";
import { cgmCsv }             from "./cgm-csv";
import { microbiomePdf }      from "./microbiome-pdf";
import { garminCsv }          from "./garmin-csv";
import { whoopCsv }           from "./whoop-csv";
import { hrvCsv }             from "./hrv-csv";
import { nutritionCsv }       from "./nutrition-csv";
import { ouraApi }            from "./phase2/oura-api";
import { garminApi }          from "./phase2/garmin-api";
import { appleHealthExport }  from "./phase2/apple-health-export";
import { fhirBundle }         from "./phase2/fhir-bundle";

const ALL: ConnectorModule[] = [
  bioresonancePdf, bloodLabPdf, bloodLabCsv, bodyCompositionCsv,
  imagingPdf, noterrocsv, genericPdf, genericImage,
  hormonePdf, cgmCsv, microbiomePdf,
  garminCsv, whoopCsv, hrvCsv, nutritionCsv,
  ouraApi, garminApi, appleHealthExport, fhirBundle,
];

export const connectorRegistry = new Map<ConnectorId, ConnectorModule>(
  ALL.map((c) => [c.id, c]),
);

export function getConnector(id: string): ConnectorModule {
  const c = connectorRegistry.get(id as ConnectorId);
  if (!c) throw new Error(`Unknown connector: ${id}`);
  return c;
}

export { ALL as allConnectors };
