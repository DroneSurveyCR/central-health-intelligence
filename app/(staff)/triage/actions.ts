"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

// Triage actions run with the RLS session client (createClient), so every write
// is automatically scoped to the caller's practice. No explicit practice_id.

function id(fd: FormData, k = "id"): string {
  return String(fd.get(k) ?? "").trim();
}

export async function ackAlert(fd: FormData) {
  const p = await requireStaff();
  const alertId = id(fd);
  if (!alertId) return;
  const supabase = await createClient();
  await supabase
    .from("alerts")
    .update({ status: "ack", acknowledged_by: p.id })
    .eq("id", alertId);
  revalidatePath("/triage");
}

export async function snoozeAlert(fd: FormData) {
  await requireStaff();
  const alertId = id(fd);
  if (!alertId) return;
  const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  await supabase
    .from("alerts")
    .update({ status: "snoozed", snoozed_until: until })
    .eq("id", alertId);
  revalidatePath("/triage");
}

export async function resolveAlert(fd: FormData) {
  await requireStaff();
  const alertId = id(fd);
  if (!alertId) return;
  const supabase = await createClient();
  await supabase.from("alerts").update({ status: "resolved" }).eq("id", alertId);
  revalidatePath("/triage");
}

export async function addAlertRule(fd: FormData) {
  const p = await requireStaff();
  const name = String(fd.get("name") ?? "").trim();
  const metric = String(fd.get("metric") ?? "").trim();
  const comparator = String(fd.get("comparator") ?? "gt").trim();
  const thresholdRaw = fd.get("threshold");
  const severity = String(fd.get("severity") ?? "warn").trim();
  if (!name || !metric || thresholdRaw == null || thresholdRaw === "") return;

  const supabase = await createClient();
  // practice_id auto-fills via default current_practice_id() for session writes.
  await supabase.from("alert_rules").insert({
    name,
    metric,
    comparator,
    threshold: Number(thresholdRaw),
    severity,
    enabled: true,
    created_by: p.id,
  });
  revalidatePath("/triage");
}

export async function toggleAlertRule(fd: FormData) {
  await requireStaff();
  const ruleId = id(fd);
  if (!ruleId) return;
  // Current enabled state is submitted by the form so we can flip it.
  const enabled = String(fd.get("enabled") ?? "") === "true";
  const supabase = await createClient();
  await supabase.from("alert_rules").update({ enabled: !enabled }).eq("id", ruleId);
  revalidatePath("/triage");
}
