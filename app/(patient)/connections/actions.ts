"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { revalidatePath } from "next/cache";

export type ConsentDomain = "wearables" | "labs" | "nutrition" | "mood" | "weight";
export type ConsentScope = "clinic" | "private";

const DOMAINS: readonly ConsentDomain[] = ["wearables", "labs", "nutrition", "mood", "weight"];

/**
 * Patient sets who can see a data domain: their care team ("clinic") or
 * keep it private ("private"). Upserts patient_data_consents under RLS — the
 * logged-in patient only ever writes their own row. practice_id auto-fills via
 * the column default (current_practice_id()); the unique(patient_id, domain)
 * constraint is the conflict target.
 */
export async function setConsent(domain: ConsentDomain, scope: ConsentScope) {
  if (!DOMAINS.includes(domain)) throw new Error("Unknown data domain");
  if (scope !== "clinic" && scope !== "private") throw new Error("Invalid scope");

  const me = await getCurrentPatient();
  if (!me) throw new Error("Not signed in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_data_consents")
    .upsert(
      { patient_id: me.id, domain, scope, updated_at: new Date().toISOString() },
      { onConflict: "patient_id,domain" },
    );
  if (error) throw new Error(error.message);

  await logAudit({
    action: "update",
    resource: "patient_data_consents",
    patientId: me.id,
  });

  revalidatePath("/connections");
}
