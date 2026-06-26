import Papa from "papaparse";

const MAP: Record<string, string> = {
  "weight(kg)": "weight_kg", "weight": "weight_kg",
  "bmi": "bmi",
  "body fat%": "body_fat_pct", "fat%": "body_fat_pct",
  "muscle mass(kg)": "muscle_mass_kg", "muscle mass": "muscle_mass_kg",
  "bone mass(kg)": "bone_mass_kg", "bone mass": "bone_mass_kg",
  "body water%": "water_pct", "tbw%": "water_pct",
  "visceral fat": "visceral_fat_level",
  "metabolic age": "basal_metabolic_rate",
  "date": "measured_on",
};

export function parseTanita(buf: Buffer): Record<string, unknown>[] {
  const { data } = Papa.parse<Record<string, string>>(buf.toString("utf-8"), { header: true, skipEmptyLines: true });
  return data.map((row) => {
    const result: Record<string, unknown> = { device_model: "Tanita", raw_data: row };
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
