import { describe, it, expect } from "vitest";
import { dueReminders } from "../reminders/window";

const W = [
  { key: "h24", minutes: 1440 },
  { key: "h2", minutes: 120 },
];

describe("dueReminders", () => {
  it("fires the 24h reminder ~23.5h out", () => {
    expect(dueReminders(1410, {}, W)).toEqual(["h24"]);
  });
  it("fires the 2h reminder ~1.5h out", () => {
    expect(dueReminders(90, {}, W)).toEqual(["h2"]);
  });
  it("does not re-fire an already-sent window", () => {
    expect(dueReminders(1410, { h24: true }, W)).toEqual([]);
  });
  it("does not fire stale windows (too far out or already past)", () => {
    expect(dueReminders(2000, {}, W)).toEqual([]);
    expect(dueReminders(5, { h24: true, h2: true }, W)).toEqual([]);
  });
  it("respects the band boundary (fires at exactly the window minute)", () => {
    expect(dueReminders(120, {}, W)).toEqual(["h2"]);
    expect(dueReminders(60, {}, W)).toEqual([]); // (60,120] is exclusive at 60
  });
});
