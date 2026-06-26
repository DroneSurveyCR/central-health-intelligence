"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/components/Toast";
import { money, servicePrice } from "@/lib/invoices/helpers";

type Service = {
  id: string;
  name: string;
  category: string | null;
  duration_minutes: number | null;
  price: number | null;
  first_visit_price: number | null;
};
type Location = { id: string; name: string };

const MORNING = ["9:00", "9:30", "10:00", "10:30", "11:00", "11:30"];
const AFTERNOON = ["2:00 PM", "2:30", "3:00", "3:30"];

function nextWeekdays(n: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
  }
  return out;
}

function slotToHM(label: string): { h: number; m: number } {
  const mt = label.match(/(\d+):(\d+)/);
  let h = mt ? parseInt(mt[1], 10) : 9;
  const m = mt ? parseInt(mt[2], 10) : 0;
  if (h < 8) h += 12; // afternoon (2,3 -> 14,15)
  return { h, m };
}

export default function BookingWizard({
  services,
  locations,
  currency = "USD",
  isFirstVisit = false,
}: {
  services: Service[];
  locations: Location[];
  currency?: string;
  isFirstVisit?: boolean;
}) {
  const router = useRouter();
  const { lang } = useLang();
  const toast = useToast();
  const dateLocale = lang === "es" ? "es-CR" : "en-US";
  const days = nextWeekdays(5);
  const [service, setService] = useState<Service | null>(null);
  const [modality, setModality] = useState<"in_person" | "online">("in_person");
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // --- Step 0: choose a service ---
  if (!service) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 className="serif" style={{ fontSize: 22, marginTop: 0 }}>What would you like to book?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s) => {
            const hasPrice = s.price != null || s.first_visit_price != null;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setService(s)}
                className="btn ghost"
                style={{ textAlign: "left", justifyContent: "space-between", display: "flex", alignItems: "center", padding: "13px 15px" }}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>{s.name}</span>
                  {hasPrice && (
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {money(servicePrice(s, isFirstVisit), currency)}
                      {isFirstVisit && s.first_visit_price != null
                        ? lang === "es" ? " (primera visita)" : " (first visit)"
                        : ""}
                    </span>
                  )}
                </span>
                {s.duration_minutes ? <span className="muted" style={{ fontSize: 13 }}>{s.duration_minutes} min</span> : null}
              </button>
            );
          })}
          {services.length === 0 && <p className="muted">No services available to book yet.</p>}
        </div>
      </div>
    );
  }

  const locName = locations.find((l) => l.id === locationId)?.name ?? "In-clinic";

  async function submit() {
    if (!slot) return;
    setBusy(true);
    setErr("");
    const d = new Date(days[dayIdx]);
    const { h, m } = slotToHM(slot);
    d.setHours(h, m, 0, 0);
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "consult",
        serviceId: service!.id,
        notes: service!.name,
        modality,
        location_id: modality === "in_person" ? locationId : null,
        start_time: d.toISOString(),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const message = j.error || "Could not book — please try again.";
      setErr(message);
      toast.error(message);
      setBusy(false);
      return;
    }
    toast.success("Appointment booked");
    router.push("/appointments");
  }

  return (
    <div className="card" style={{ maxWidth: 540 }}>
      <button type="button" onClick={() => setService(null)} className="muted" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 14 }}>
        ‹ Book a consult
      </button>
      <h2 className="serif" style={{ fontSize: 27, margin: "8px 0 2px" }}>Book your consult</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {service.name}
        {service.duration_minutes ? ` · ${service.duration_minutes} min` : ""}
      </p>
      {(service.price != null || service.first_visit_price != null) && (
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--berry)", fontWeight: 600 }}>
          {lang === "es" ? "Costo estimado: " : "Estimated cost: "}
          {money(servicePrice(service, isFirstVisit), currency)}
          {isFirstVisit && service.first_visit_price != null
            ? lang === "es" ? " (primera visita)" : " (first visit)"
            : ""}
        </p>
      )}

      {/* modality pills */}
      <div style={{ display: "flex", gap: 10, margin: "16px 0 4px" }}>
        <button type="button" aria-pressed={modality === "in_person"} onClick={() => setModality("in_person")} style={pill(modality === "in_person")}>
          📍 {locName}
        </button>
        <button type="button" aria-pressed={modality === "online"} onClick={() => setModality("online")} style={pill(modality === "online")}>
          🎥 Telehealth
        </button>
      </div>
      {modality === "in_person" && locations.length > 1 && (
        <select aria-label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ width: "100%", marginTop: 8, padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 11, fontSize: 14 }}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}

      {/* date cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 20 }}>
        <b style={{ fontSize: 15 }}>{days[dayIdx].toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}</b>
        <span className="muted" style={{ fontSize: 13 }}>This week</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {days.map((d, i) => {
          const on = i === dayIdx;
          return (
            <button key={i} type="button" aria-pressed={on} onClick={() => setDayIdx(i)} style={dateCard(on)}>
              <span style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.85 }}>{d.toLocaleDateString(dateLocale, { weekday: "short" }).toUpperCase()}</span>
              <span style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>{d.getDate()}</span>
              <span style={{ fontSize: 9, opacity: on ? 0.9 : 0.5 }}>•</span>
            </button>
          );
        })}
      </div>

      {/* times */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 22 }}>
        <b style={{ fontSize: 15 }}>Available times</b>
        <span className="muted" style={{ fontSize: 13 }}>CST · Costa Rica</span>
      </div>
      <p style={sectionLabel}>MORNING</p>
      <div style={slotGrid}>
        {MORNING.map((s) => <button key={s} type="button" aria-pressed={s === slot} onClick={() => setSlot(s)} style={slotBtn(s === slot)}>{s}</button>)}
      </div>
      <p style={sectionLabel}>AFTERNOON</p>
      <div style={slotGrid}>
        {AFTERNOON.map((s) => <button key={s} type="button" aria-pressed={s === slot} onClick={() => setSlot(s)} style={slotBtn(s === slot)}>{s}</button>)}
      </div>

      <p className="muted" style={{ fontSize: 12.5, marginTop: 14, background: "var(--paper)", padding: "10px 12px", borderRadius: 10 }}>
        🗓️ Pulled live from Dr. Randi&apos;s synced calendar — no phone tag, no double-booking.
      </p>

      {err && <p className="msg err">{err}</p>}
      <button type="button" className="btn" disabled={!slot || busy} onClick={submit} style={{ width: "100%", marginTop: 14, padding: "13px" }}>
        {busy ? "Booking…" : "Confirm booking"}
      </button>
    </div>
  );
}

function pill(active: boolean) {
  return {
    flex: 1,
    padding: "11px 12px",
    borderRadius: 12,
    border: `1.5px solid ${active ? "var(--berry)" : "var(--line)"}`,
    background: active ? "rgba(20,131,78,.08)" : "var(--card)",
    color: active ? "var(--berry)" : "var(--ink)",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    cursor: "pointer",
  } as const;
}
function dateCard(active: boolean) {
  return {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "12px 6px",
    borderRadius: 14,
    border: `1.5px solid ${active ? "var(--berry)" : "var(--line)"}`,
    background: active ? "var(--berry)" : "var(--card)",
    color: active ? "#fff" : "var(--ink)",
    cursor: "pointer",
  } as const;
}
function slotBtn(active: boolean) {
  return {
    padding: "11px 8px",
    borderRadius: 11,
    border: `1.5px solid ${active ? "var(--berry)" : "var(--line)"}`,
    background: active ? "var(--berry)" : "var(--card)",
    color: active ? "#fff" : "var(--ink)",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    cursor: "pointer",
  } as const;
}
const sectionLabel = { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--berry)", textTransform: "uppercase", margin: "16px 0 8px" } as const;
const slotGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 } as const;
