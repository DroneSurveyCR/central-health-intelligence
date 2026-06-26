// Apply healthsync-app migrations 021-028 to a target Supabase project via the
// Management API. Env: SUPABASE_PAT, TARGET_REF.
import { readFile } from "node:fs/promises";

const PAT = process.env.SUPABASE_PAT;
const TARGET = process.env.TARGET_REF;
if (!PAT || !TARGET) { console.error("Need SUPABASE_PAT and TARGET_REF"); process.exit(1); }

const FILES = [
  "021_visit_status", "022_psychedelic", "023_peptide", "024_biomarker",
  "025_nutrition", "026_longevity", "027_wearables", "028_ai_drafts",
];
const BASE = "C:/Users/nicki/Desktop/claude/healthsync-app/supabase/migration_";

let fail = 0;
for (const f of FILES) {
  const sql = await readFile(`${BASE}${f}.sql`, "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${TARGET}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const ok = res.ok;
  if (!ok) fail++;
  console.log(`${f}: ${res.status} ${ok ? "ok" : (await res.text()).slice(0, 220)}`);
  await new Promise((r) => setTimeout(r, 500));
}
console.log(fail ? `\n${fail} failed` : "\nAll applied.");
process.exit(fail ? 1 : 0);
