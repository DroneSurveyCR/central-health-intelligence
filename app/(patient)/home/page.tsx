import Link from "next/link";
import { getCurrentPatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";
import {
  computeCurrentPhase,
  planProgressPct,
  type Plan,
  type PlanPhase,
} from "@/lib/plan/helpers";
import {
  summarizePerMarker,
  type LabResult,
  type MarkerSummary,
} from "@/lib/labs/helpers";
import { DonutChart } from "@/lib/charts/Charts";

type ApptRow = { id: string; start_time: string; type: string | null; modality: string | null };
type ScanRow = { scan_date: string | null };
type IntakeRow = { completed: boolean | null };
type CompletionRow = { plan_item_id: string; completed: boolean };
type PlanItemRow = { id: string; phase_id: string | null; name: string | null };

const APPT_TYPE_KEY: Record<string, string> = {
  consult: "home_appt_type_consult",
  consultation: "home_appt_type_consult",
  followup: "home_appt_type_followup",
  "follow-up": "home_appt_type_followup",
  scan: "home_appt_type_scan",
  scan_review: "home_appt_type_scan",
};

function dayDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export default async function PatientHome() {
  const me = await getCurrentPatient();
  const lang = await getServerLang();
  const locale = lang === "es" ? "es-CR" : "en-US";

  if (!me) return <OnboardingCTA lang={lang} name={null} />;

  const supabase = await createClient();
  const nowISO = new Date().toISOString();

  const [planRes, apptRes, scanRes, unreadRes, intakeRes, labsRes] = await Promise.all([
    supabase.from("plans").select("id, title, start_date, end_date, status").eq("patient_id", me.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("appointments").select("id, start_time, type, modality").eq("patient_id", me.id).is("deleted_at", null).gte("start_time", nowISO).order("start_time", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("scans").select("scan_date").eq("patient_id", me.id).order("scan_date", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("patient_id", me.id).eq("sender", "staff").is("read_at", null),
    supabase.from("intake_forms").select("completed").eq("patient_id", me.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("id, patient_id, marker, value, unit, optimal_low, optimal_high, category, collected_on, created_at").eq("patient_id", me.id).order("collected_on", { ascending: true }),
  ]);

  const plan = planRes.data as Plan | null;
  const nextAppt = apptRes.data as ApptRow | null;
  const scan = scanRes.data as ScanRow | null;
  const intakeDone = (intakeRes.data as IntakeRow | null)?.completed === true;
  const unread = unreadRes.count ?? 0;
  const labRows = (labsRes.data ?? []) as LabResult[];
  const markers = summarizePerMarker(labRows);
  const highlight: MarkerSummary | null =
    markers.find((m) => m.trend === "improving") ?? markers.find((m) => m.status === "optimal") ?? markers[0] ?? null;

  if (!plan && !intakeDone) return <OnboardingCTA lang={lang} name={me.first_name ?? null} />;

  // Plan day-of-90 + current phase + today's tasks.
  let phaseLabel: string | null = null;
  let progressPct = 0;
  let dayOfPlan = 0;
  let totalDays = 90;
  let tasksDone = 0;
  let tasksTotal = 0;
  let chips: { name: string; done: boolean }[] = [];
  if (plan) {
    const today = new Date();
    const todayISO = new Intl.DateTimeFormat("en-CA").format(today);
    const start = plan.start_date ? new Date(String(plan.start_date) + "T00:00:00") : null;
    const end = plan.end_date ? new Date(String(plan.end_date) + "T00:00:00") : null;
    if (start && end) totalDays = Math.max(1, dayDiff(start, end));
    if (start) dayOfPlan = Math.max(1, Math.min(totalDays, dayDiff(start, today) + 1));

    const [phaseRes, itemRes] = await Promise.all([
      supabase.from("plan_phases").select("id, plan_id, phase_number, name, start_offset_days, end_offset_days").eq("plan_id", plan.id).order("phase_number"),
      supabase.from("plan_items").select("id, phase_id, name").eq("plan_id", plan.id),
    ]);
    const phases = (phaseRes.data ?? []) as PlanPhase[];
    const items = (itemRes.data ?? []) as PlanItemRow[];
    progressPct = planProgressPct(plan, today, phases);
    const cur = computeCurrentPhase(plan, phases, today);
    if (cur) {
      phaseLabel = cur.name ?? `${t("plan_phase_word", lang)} ${cur.phase_number}`;
      const phaseItems = items.filter((it) => it.phase_id === cur.id);
      tasksTotal = phaseItems.length;
      let doneIds = new Set<string>();
      if (phaseItems.length > 0) {
        const { data: completions } = (await supabase.from("plan_completions").select("plan_item_id, completed").eq("patient_id", me.id).eq("date", todayISO).in("plan_item_id", phaseItems.map((p) => p.id))) as { data: CompletionRow[] | null };
        doneIds = new Set((completions ?? []).filter((c) => c.completed).map((c) => c.plan_item_id));
        tasksDone = doneIds.size;
      }
      chips = phaseItems.slice(0, 6).map((it) => ({ name: it.name ?? "Task", done: doneIds.has(it.id) }));
    }
  }

  const firstName = me.first_name ?? "";
  const initials = `${(me.first_name ?? "?")[0] ?? ""}${(me.last_name ?? "")[0] ?? ""}`.toUpperCase() || "•";
  const dayPct = totalDays > 0 ? (dayOfPlan / totalDays) * 100 : 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* greeting */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t("home_welcome_back", lang)}</p>
          <h1 className="serif" style={{ fontSize: 30, margin: "2px 0 0" }}>{firstName || t("welcome", lang)}</h1>
        </div>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg, var(--berry-l), var(--gold))", color: "#143a2a", display: "grid", placeItems: "center", fontWeight: 700, fontFamily: "var(--serif)", flexShrink: 0 }}>{initials}</div>
      </div>

      {/* PROGRAM HERO */}
      {plan && (
        <div style={{ marginTop: 18, borderRadius: 22, padding: 22, color: "#fff", background: "linear-gradient(135deg, #155a3c 0%, #103a2a 100%)", boxShadow: "0 24px 60px -28px rgba(16,58,42,0.55)", display: "flex", alignItems: "center", gap: 18 }}>
          <DonutChart value={dayPct} centerText={String(dayOfPlan)} label={`${t("home_of", lang)} ${totalDays}`} color="var(--gold, #f4a63c)" track="rgba(255,255,255,0.16)" size={104} thickness={10} textColor="#fff" />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--gold)" }}>{t("home_your_program", lang)}</p>
            <h2 className="serif" style={{ margin: "4px 0 0", fontSize: 22, color: "#fff" }}>{phaseLabel ?? plan.title ?? t("plan_title_default", lang)}</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, opacity: 0.85, lineHeight: 1.5 }}>
              {t("home_program_day", lang)} {dayOfPlan} {t("home_of", lang)} {totalDays} · {progressPct}{t("home_plan_complete", lang)}
            </p>
          </div>
        </div>
      )}

      {/* Your results */}
      {highlight && (
        <Section title={t("home_card_labs", lang)} link={{ href: "/labs", label: t("home_view_all", lang) }}>
          <Link href="/labs" className="card" style={{ maxWidth: "none", textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <b style={{ fontSize: 16 }}>{highlight.marker}</b>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--berry)" }}>{highlight.latest.value}<span className="muted" style={{ fontSize: 12, fontWeight: 500, marginLeft: 3 }}>{highlight.unit}</span></span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#fff", background: highlight.status === "optimal" ? "var(--berry)" : "var(--rust)", padding: "3px 10px", borderRadius: 999, textTransform: "capitalize" }}>
                {highlight.status === "optimal" ? t("labs_status_optimal", lang) : highlight.status === "below" ? t("labs_status_below", lang) : t("labs_status_above", lang)}
              </span>
            </div>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
              {highlight.trend === "improving" ? `↑ ${t("labs_trend_improving", lang)}` : highlight.status === "optimal" ? t("labs_status_optimal", lang) : t("labs_trend_flat", lang)}
            </p>
          </Link>
        </Section>
      )}

      {/* Next appointment */}
      <Section title={t("home_card_appointment", lang)} link={nextAppt ? { href: "/appointments", label: t("home_view_all", lang) } : { href: "/book", label: t("home_book", lang) }}>
        <Link href={nextAppt ? "/appointments" : "/book"} className="card" style={{ maxWidth: "none", textDecoration: "none", color: "inherit", display: "block" }}>
          {nextAppt ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <DateBadge iso={nextAppt.start_time} locale={locale} />
              <div>
                <b style={{ fontSize: 15 }}>{nextAppt.type ? (t(APPT_TYPE_KEY[nextAppt.type.toLowerCase()] ?? "", lang) || nextAppt.type) : t("home_card_appointment", lang)}</b>
                <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}>
                  {new Date(nextAppt.start_time).toLocaleString(locale, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {nextAppt.modality === "online" ? t("appointments_online", lang) : t("appointments_in_person", lang)}
                </p>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>{t("home_no_appointment", lang)}</p>
          )}
        </Link>
      </Section>

      {/* Today's plan */}
      {plan && (
        <Section title={t("home_card_today", lang)} link={{ href: "/today", label: t("home_open_today", lang) }}>
          <Link href="/today" className="card" style={{ maxWidth: "none", textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <b style={{ fontSize: 15 }}>{tasksDone} {t("home_tasks_of", lang)} {tasksTotal} {t("today_done_suffix", lang)}</b>
              <span className="muted" style={{ fontSize: 12 }}>{phaseLabel}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--paper)", marginTop: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0}%`, background: "linear-gradient(90deg, var(--berry), var(--berry-l))" }} />
            </div>
            {chips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                {chips.map((c, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999, border: "1px solid var(--line)", background: c.done ? "rgba(20,131,78,0.10)" : "var(--card)", color: c.done ? "var(--berry)" : "var(--ink)", fontWeight: c.done ? 700 : 500 }}>
                    {c.done ? "✓ " : ""}{c.name}
                  </span>
                ))}
              </div>
            )}
          </Link>
        </Section>
      )}

      {/* Explore grid */}
      <p className="eyebrow" style={{ marginTop: 26 }}>{t("home_explore", lang)}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ExploreTile href="/labs" title={t("home_card_labs", lang)} sub={t("home_tile_labs", lang)} />
        <ExploreTile href="/plan" title={t("plan", lang)} sub={t("home_tile_plan", lang)} />
        <ExploreTile href="/messages" title={t("messages", lang)} sub={unread > 0 ? `${unread} ${unread === 1 ? t("home_unread_one", lang) : t("home_unread_many", lang)}` : t("home_tile_messages", lang)} />
        <ExploreTile href="/body" title={t("body", lang)} sub={t("home_tile_body", lang)} />
        {hasScanLink(scan) && <ExploreTile href="/report" title={t("report", lang)} sub={t("home_tile_report", lang)} />}
      </div>
    </div>
  );
}

function hasScanLink(scan: ScanRow | null) {
  return !!scan?.scan_date;
}

function Section({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9 }}>
        <p className="eyebrow" style={{ margin: 0 }}>{title}</p>
        {link && <Link href={link.href} style={{ fontSize: 13, fontWeight: 600, color: "var(--berry)" }}>{link.label} →</Link>}
      </div>
      {children}
    </div>
  );
}

function DateBadge({ iso, locale }: { iso: string; locale: string }) {
  const d = new Date(iso);
  return (
    <div style={{ width: 54, height: 54, borderRadius: 14, background: "rgba(20,131,78,0.08)", border: "1px solid var(--line)", display: "grid", placeItems: "center", flexShrink: 0, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: "var(--berry)" }}>{d.getDate()}</div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)" }}>{d.toLocaleDateString(locale, { month: "short" })}</div>
    </div>
  );
}

function ExploreTile({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="card" style={{ maxWidth: "none", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16, padding: 16, minHeight: 92 }}>
      <b style={{ fontSize: 15.5 }}>{title}</b>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{sub}</p>
        <span aria-hidden style={{ color: "var(--berry)", fontSize: 15 }}>→</span>
      </div>
    </Link>
  );
}

function OnboardingCTA({ lang, name }: { lang: Lang; name: string | null }) {
  return (
    <div>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px" }}>{t("welcome", lang)}{name ? `, ${name}` : ""}</h1>
      <p className="muted">{t("home_subtitle", lang)}</p>
      <p style={{ marginTop: 16 }}>
        <Link className="btn" href="/intake" style={{ display: "inline-block", textDecoration: "none" }}>{t("start_intake", lang)}</Link>
      </p>
    </div>
  );
}
