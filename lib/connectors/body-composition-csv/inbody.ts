import Papa from "papaparse";

const MAP: Record<string, string> = {
  "weight": "weight_kg", "body weight": "weight_kg",
  "bmi": "bmi",
  "percent body fat": "body_fat_pct", "body fat %": "body_fat_pct", "pbf": "body_fat_pct",
  "skeletal muscle mass": "muscle_mass_kg", "smm": "muscle_mass_kg",
  "bone mineral content": "bone_mass_kg", "bmc": "bone_mass_kg",
  "total body water": "water_pct",
  "visceral fat level": "visceral_fat_level", "vfl": "visceral_fat_level",
  "basal metabolic rate": "basal_metabolic_rate", "bmr": "basal_metabolic_rate",
  "date": "measured_on",
};

export function parseInBody(buf: Buffer): Record<string, unknown>[] {
  const { data } = Papa.parse<Record<string, string>>(buf.toString("utf-8"), { header: true, skipEmptyLines: true });
  return data.map((row) => {
    const result: Record<string, unknown> = { device_model: "InBody", raw_data: row };
    const rowLower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
    for (const [src, dst] of Object.entries(MAP)) {
      const v = rowLower[src];
      if (!v) continue;
      if (dst === "measured_on") result[dst] = v;
      else if (dst === "visceral_fat_level" || dst === "basal_metabolic_rate") result[dst] = parseInt(v) || null;
      else result[dst] = parseFloat(v) || null;
    }
    return result;
  });
}
