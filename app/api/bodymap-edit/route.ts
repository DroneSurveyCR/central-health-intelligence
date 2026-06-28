import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";
import { ALL_PART_IDS, PART_ALIASES } from "@/lib/bodymap/schema";

const STATUSES = new Set(["sage", "gold", "rust"]);

function cleanPoint(raw: unknown): { st: string; v: string; score: number } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const st = STATUSES.has(String(r.st)) ? String(r.st) : "sage";
  const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
  const v = String(r.v ?? "").slice(0, 40);
  return { st, v, score };
}

export async function POST(request: Request) {
  // Staff only.
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patientId = String(body.patientId ?? "").trim();
  if (!patientId) return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const rawParts = (body.parts ?? {}) as Record<string, { s1?: unknown; s2?: unknown; note?: unknown }>;
  const parts: Record<string, { s1: object; s2: object; note: string }> = {};
  for (const id of ALL_PART_IDS) {
    const raw = rawParts[id];
    if (!raw) continue;
    const part = { s1: cleanPoint(raw.s1), s2: cleanPoint(raw.s2), note: String(raw.note ?? "").slice(0, 400) };
    parts[id] = part;
    const alias = PART_ALIASES[id];
    if (alias) parts[alias] = part; // 3D viewer reads the alias id
  }
  if (Object.keys(parts).length === 0)
    return NextResponse.json({ error: "no systems provided" }, { status: 400 });

  const cross = Array.isArray(body.cross)
    ? (body.cross as Record<string, unknown>[])
        .map((c) => ({
          id: String(c.id ?? "").slice(0, 40),
          name: String(c.name ?? "").slice(0, 60),
          st: STATUSES.has(String(c.st)) ? String(c.st) : "sage",
          sub: String(c.sub ?? "").slice(0, 140),
          note: String(c.note ?? "").slice(0, 400),
          items: Array.isArray(c.items) ? c.items : [],
        }))
        .filter((c) => c.id)
    : [];

  const supabase = await createClient();

  // Latest scan for this patient (RLS limits to patients the practitioner can access).
  const { data: scan } = await supabase
    .from("scans")
    .select("id, scan_date")
    .eq("patient_id", patientId)
    .order("scan_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  let scanId = scan?.id as string | undefined;
  let scanDate = scan?.scan_date as string | null | undefined;

  // No scan yet → create one so the body map has somewhere to live.
  if (!scanId) {
    const today = new Intl.DateTimeFormat("en-CA").format(new Date());
    const { data: created, error: createErr } = await supabase
      .from("scans")
      .insert({ patient_id: patientId, scan_type: "bioresonance", scan_date: today, parse_status: "parsed" })
      .select("id, scan_date")
      .maybeSingle();
    if (createErr || !created)
      return NextResponse.json({ error: createErr?.message ?? "could not create scan" }, { status: 400 });
    scanId = created.id;
    scanDate = created.scan_date;
  }

  const bodymap = { version: 1, scanDate, parts, cross };
  const { error: upErr } = await supabase.from("scans").update({ bodymap }).eq("id", scanId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  await logAudit({ action: "update", resource: "scan", resourceId: scanId, patientId });
  return NextResponse.json({ ok: true, scanId });
}
