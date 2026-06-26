import { describe, it, expect } from "vitest";
import { buildICal } from "../ical/feed";

describe("buildICal", () => {
  it("produces a valid, PHI-free VCALENDAR with one event", () => {
    const ics = buildICal("Casa Elev8", [
      {
        ical_uid: "abc",
        start_time: "2026-06-22T10:45:00.000Z",
        end_time: null,
        type: "consult",
        modality: "online",
        status: "scheduled",
      },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:abc@healthsync");
    expect(ics).toContain("DTSTART:20260622T104500Z");
    expect(ics).toContain("Casa Elev8");
    // No PHI in the feed
    expect(ics).not.toMatch(/marco|vega|diagnos|patient name/i);
  });

  it("skips cancelled appointments", () => {
    const ics = buildICal("X", [
      {
        ical_uid: "c",
        start_time: "2026-06-22T10:45:00.000Z",
        end_time: null,
        type: "consult",
        modality: "online",
        status: "cancelled",
      },
    ]);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("uses CRLF line endings (RFC 5545)", () => {
    const ics = buildICal("X", []);
    expect(ics).toContain("\r\n");
  });
});
