import Papa from "papaparse";

type RawRow = Record<string, string>;

function col(headers: string[], patterns: string[]): string | undefined {
  return headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())));
}
function num(v: string | undefined): number | null {
  const n = parseFloat(v ?? "");
  return isNaN(n) || n < 0 ? null : n;
}
function dateOnly(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export interface NutritionRow { marker: string; value: number; unit: string; optimal_low?: number; optimal_high?: number; category: string; collected_on: string }

const MACROS: Array<{ marker: string; aliases: string[]; unit: string; low?: number; high?: number; cat: string }> = [
  { marker: "Energy",           aliases: ["calories", "energy (kcal)", "kcal"],             unit: "kcal",  low: 1600,  high: 2400,  cat: "Macronutrients" },
  { marker: "Protein",          aliases: ["protein", "protein (g)"],                         unit: "g",     low: 50,    high: 150,   cat: "Macronutrients" },
  { marker: "Total Carbs",      aliases: ["carbohydrates", "carbs", "total carbs"],          unit: "g",     low: 100,   high: 200,   cat: "Macronutrients" },
  { marker: "Net Carbs",        aliases: ["net carbs"],                                      unit: "g",     cat: "Macronutrients" },
  { marker: "Dietary Fat",      aliases: ["fat", "total fat", "total lipids"],               unit: "g",     low: 40,    high: 90,    cat: "Macronutrients" },
  { marker: "Dietary Fiber",    aliases: ["fiber", "dietary fiber", "fibre"],                unit: "g",     low: 25,    high: 40,    cat: "Macronutrients" },
  { marker: "Sugar",            aliases: ["sugar", "total sugars"],                          unit: "g",     high: 25,   cat: "Macronutrients" },
  { marker: "Water",            aliases: ["water"],                                          unit: "g",     low: 2000,  high: 3000,  cat: "Macronutrients" },
  { marker: "Vitamin D",        aliases: ["vitamin d", "vitamin d3", "vitamin d (iu)"],     unit: "IU",    low: 1000,  high: 5000,  cat: "Vitamins" },
  { marker: "Vitamin B12",      aliases: ["b12", "vitamin b12", "cobalamin"],               unit: "µg",    low: 400,   high: 1000,  cat: "Vitamins" },
  { marker: "Folate",           aliases: ["folate", "folic acid", "vitamin b9"],            unit: "µg",    low: 400,   high: 800,   cat: "Vitamins" },
  { marker: "Vitamin C",        aliases: ["vitamin c", "ascorbic acid"],                    unit: "mg",    low: 200,   high: 1000,  cat: "Vitamins" },
  { marker: "Vitamin A",        aliases: ["vitamin a"],                                     unit: "IU",    low: 2500,  high: 10000, cat: "Vitamins" },
  { marker: "Vitamin K",        aliases: ["vitamin k"],                                     unit: "µg",    low: 90,    high: 300,   cat: "Vitamins" },
  { marker: "Magnesium",        aliases: ["magnesium"],                                     unit: "mg",    low: 300,   high: 600,   cat: "Minerals" },
  { marker: "Zinc",             aliases: ["zinc"],                                          unit: "mg",    low: 10,    high: 25,    cat: "Minerals" },
  { marker: "Iron",             aliases: ["iron"],                                          unit: "mg",    low: 8,     high: 45,    cat: "Minerals" },
  { marker: "Calcium",          aliases: ["calcium"],                                       unit: "mg",    low: 800,   high: 1500,  cat: "Minerals" },
  { marker: "Potassium",        aliases: ["potassium"],                                     unit: "mg",    low: 2600,  high: 4700,  cat: "Minerals" },
  { marker: "Sodium",           aliases: ["sodium"],                                        unit: "mg",    high: 1500, cat: "Minerals" },
  { marker: "Omega-3",          aliases: ["omega-3", "omega 3", "epa+dha"],                unit: "mg",    low: 2000,  high: 4000,  cat: "Fatty Acids" },
  { marker: "Saturated Fat",    aliases: ["saturated fat", "saturated"],                   unit: "g",     high: 20,   cat: "Fatty Acids" },
];

export function parseNutrition(buf: Buffer): NutritionRow[] {
  const text = buf.toString("utf-8");
  const { data: rows, meta } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  const headers = meta.fields ?? [];
  const results: NutritionRow[] = [];

  const dateCol = col(headers, ["Date", "Day", "Timestamp"]);
  if (!dateCol) return [];

  for (const r of rows as RawRow[]) {
    const day = dateOnly(r[dateCol]);
    if (!day) continue;
    for (const m of MACROS) {
      const c = col(headers, m.aliases);
      const v = c ? num(r[c]) : null;
      if (v != null && v > 0) {
        results.push({ collected_on: day, marker: m.marker, value: v, unit: m.unit, optimal_low: m.low, optimal_high: m.high, category: `Nutrition — ${m.cat}` });
      }
    }
  }

  return results;
}
