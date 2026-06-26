type Appt = {
  ical_uid: string;
  start_time: string;
  end_time: string | null;
  type: string;
  modality: string;
  status: string;
};

function fmt(d: Date) {
  // → YYYYMMDDTHHMMSSZ (UTC)
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function labelType(t: string) {
  return (
    { consult: "Consult", follow_up: "Follow-up", scan_review: "Scan review", other: "Visit" }[t] ??
    "Appointment"
  );
}

/** Builds a non-PHI VCALENDAR feed for one patient's appointments. */
export function buildICal(practiceName: string, appts: Appt[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//HealthSync//${practiceName}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const a of appts) {
    if (a.status === "cancelled") continue;
    const start = new Date(a.start_time);
    const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + 60 * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.ical_uid}@healthsync`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${practiceName} — ${labelType(a.type)}`,
      `DESCRIPTION:${a.modality === "online" ? "Online appointment" : "In-person appointment"} — log in to view details.`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
