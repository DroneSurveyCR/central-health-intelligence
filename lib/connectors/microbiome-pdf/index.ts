import type { ConnectorModule, ParseInput, ParseResult, AnySupabaseClient } from "../types";
import { extractText } from "./extract-text";
import { generateText } from "@/lib/ai";

const SYSTEM = `You are a functional medicine data parser specializing in gut microbiome analysis. Extract microbiome data from lab reports and return ONLY valid JSON.`;

interface MicrobiomeRow {
  marker: string;
  value: number;
  unit: string;
  optimal_low?: number;
  optimal_high?: number;
  category: string;
  collected_on?: string;
}

interface MicrobiomeSummary {
  markers: MicrobiomeRow[];
  overall_note: string;
  diversity_score?: number;
  dysbiosis_index?: number;
}

async function parseWithAI(text: string): Promise<MicrobiomeSummary> {
  const prompt = `Extract microbiome data from this lab report (Viome, Biomesight, Genova GI-MAP, or similar).
Return ONLY a JSON object:
{
  "markers": [
    { "marker": "Lactobacillus spp.", "value": 3.2, "unit": "%", "optimal_low": 5, "optimal_high": 25, "category": "Beneficial Bacteria", "collected_on": "2024-01-15" }
  ],
  "overall_note": "Brief clinical summary of findings",
  "diversity_score": 7.2,
  "dysbiosis_index": 2.1
}

Marker categories:
- "Beneficial Bacteria": Lactobacillus, Bifidobacterium, Akkermansia, Faecalibacterium prausnitzii, Roseburia
- "Commensal Bacteria": Bacteroidetes, Firmicutes, Prevotella, Ruminococcus
- "Pathobionts": H. pylori, E. coli, Klebsiella, Proteus, Citrobacter
- "Parasites": Blastocystis, Giardia, Cryptosporidium
- "Fungi/Yeast": Candida, Saccharomyces
- "Digestive Markers": Secretory IgA, Elastase-1, Calprotectin, Zonulin, Beta-glucuronidase
- "Short Chain Fatty Acids": Butyrate, Propionate, Acetate
- "Diversity": Shannon diversity, species richness, Firmicutes/Bacteroidetes ratio

Rules:
- value must be numeric
- unit: %, copies/mL, µg/g, or appropriate
- optimal_low/optimal_high: use functional medicine ranges where known
- Include diversity_score and dysbiosis_index if stated in the report (null if not)
- overall_note: 2-3 sentence clinical summary

PDF text:
${text.slice(0, 6000)}`;

  const raw = await generateText({ system: SYSTEM, prompt, maxTokens: 1800 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON object");
  return JSON.parse(match[0]) as MicrobiomeSummary;
}

export const microbiomePdf: ConnectorModule = {
  id: "microbiome_pdf",
  label: "Microbiome / GI-MAP (PDF)",
  accepts: ["application/pdf"],
  targetTable: "lab_results",
  phase: "mvp",

  async parse(input: ParseInput): Promise<ParseResult> {
    const rawText = await extractText(input.fileBuffer);
    if (!rawText.trim()) throw new Error("Could not extract text from PDF.");
    const result = await parseWithAI(rawText);
    if (!result.markers?.length) throw new Error("No microbiome markers found in this PDF.");
    const missing = result.markers.filter((r) => !r.collected_on);
    const metaRow = {
      marker: "Microbiome Overall Note",
      value: result.diversity_score ?? 0,
      unit: "score",
      category: "Diversity",
      overall_note: result.overall_note,
      diversity_score: result.diversity_score,
      dysbiosis_index: result.dysbiosis_index,
    };
    return {
      rows: [...result.markers, metaRow] as unknown as Record<string, unknown>[],
      summary: result.overall_note ?? `${result.markers.length} microbiome markers extracted.`,
      warnings: missing.length ? [`${missing.length} markers missing collection date — defaulting to today.`] : [],
      rawText,
    };
  },

  async confirm(rows, importId, patientId, admin: AnySupabaseClient): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    // Filter out the meta row (no value for "Microbiome Overall Note" overall_note field in lab_results)
    const labRows = rows
      .filter((r) => r.marker !== "Microbiome Overall Note")
      .map((r) => ({ marker: r.marker, value: r.value, unit: r.unit, optimal_low: r.optimal_low, optimal_high: r.optimal_high, category: r.category, collected_on: r.collected_on ?? today, patient_id: patientId, import_id: importId }));
    const { data, error } = await admin.from("lab_results").insert(labRows).select("id");
    if (error) throw new Error(error.message);
    return (data as { id: string }[]).map((r) => r.id);
  },
};
