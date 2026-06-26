// ============================================================================
// HealthSync Cloud — ETL: migrate Casa Elev8 (Dr. Randi) in as Tenant #1.
// ----------------------------------------------------------------------------
// Copies every tenant table from the SOURCE project (Randi's live Casa Elev8)
// into the DEST project (HealthSync Cloud), stamping practice_id = practice #1.
// Primary keys are preserved so FK relationships stay intact. Runs after
// migrations 001-003 have been applied to DEST.
//
// auth_user_id is NULLED on patients/practitioners: Cloud has its own auth.users,
// so Randi's users are re-invited (magic link) on first Cloud login rather than
// FK-linked to non-existent auth rows.
//
// Env required:
//   SOURCE_URL, SOURCE_SERVICE_KEY   (Casa Elev8: bpvefxwjvaagbvloquvc)
//   DEST_URL,   DEST_SERVICE_KEY     (HealthSync Cloud)
//
// Run:  node scripts/etl-casa-elev8.mjs           (dry run: counts only)
//       node scripts/etl-casa-elev8.mjs --apply   (perform the copy)
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const APPLY = process.argv.includes("--apply");
const BATCH = 500;

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env ${k}`); process.exit(1); }
  return v;
};

const src = createClient(need("SOURCE_URL"), need("SOURCE_SERVICE_KEY"), { auth: { persistSession: false } });
const dst = createClient(need("DEST_URL"), need("DEST_SERVICE_KEY"), { auth: { persistSession: false } });

// Per-table config. Order is FK-safe (parents before children).
// global=true  -> no practice_id column (shared catalog).
// nullAuth=true -> null out auth_user_id (re-invite in Cloud).
const TABLES = [
  { name: "connector_registry", global: true },
  { name: "practitioners", nullAuth: true },
  { name: "locations" },
  { name: "services" },
  { name: "products" },
  { name: "practice_settings" },
  { name: "practice_connectors" },
  { name: "patients", nullAuth: true },
  { name: "role_assignments" },
  { name: "patient_labels" },
  { name: "intake_forms" },
  { name: "agreements" },
  { name: "appointments" },
  { name: "scans" },
  { name: "plans" },
  { name: "plan_phases" },
  { name: "plan_items" },
  { name: "plan_completions" },
  { name: "invoices" },
  { name: "invoice_items" },
  { name: "lab_results" },
  { name: "body_composition" },
  { name: "body_map_findings" },
  { name: "files" },
  { name: "health_data_imports" },
  { name: "messages" },
  { name: "orders" },
  { name: "payments" },
  { name: "progress_logs" },
  { name: "visits" },
  { name: "audit_logs" },
  { name: "audit_logs_ai" },
  { name: "data_requests" },
  { name: "email_log" },
  { name: "patient_insurance" },
  { name: "waitlist_entries" },
];

async function fetchAll(name) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await src.from(name).select("*").range(from, from + BATCH - 1);
    if (error) throw new Error(`read ${name}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return rows;
}

async function run() {
  console.log(`ETL Casa Elev8 -> Cloud  (${APPLY ? "APPLY" : "DRY RUN"})\n`);
  let totalRead = 0, totalWritten = 0;
  const report = [];

  for (const cfg of TABLES) {
    let rows;
    try {
      rows = await fetchAll(cfg.name);
    } catch (e) {
      report.push([cfg.name, "ERR", e.message]);
      continue;
    }
    totalRead += rows.length;

    const mapped = rows.map((r) => {
      const out = { ...r };
      if (!cfg.global) out.practice_id = ELEV8;
      if (cfg.nullAuth) out.auth_user_id = null;
      return out;
    });

    if (!APPLY) {
      report.push([cfg.name, rows.length, "(dry)"]);
      continue;
    }

    let written = 0;
    for (let i = 0; i < mapped.length; i += BATCH) {
      const chunk = mapped.slice(i, i + BATCH);
      const { error } = await dst.from(cfg.name).upsert(chunk, { onConflict: "id" });
      if (error) { report.push([cfg.name, rows.length, `WRITE ERR: ${error.message}`]); break; }
      written += chunk.length;
    }
    totalWritten += written;
    report.push([cfg.name, rows.length, `wrote ${written}`]);
  }

  console.log("Table".padEnd(24), "Rows".padStart(6), " Result");
  for (const [n, c, r] of report) console.log(String(n).padEnd(24), String(c).padStart(6), " " + r);
  console.log(`\nRead ${totalRead} rows; wrote ${totalWritten}.`);
  if (!APPLY) console.log("Dry run only. Re-run with --apply to perform the copy.");
  else console.log("\nNEXT: re-invite Randi's staff + patients (magic link) to relink auth_user_id.");
}

run().catch((e) => { console.error(e); process.exit(1); });
