"use client";

import { useRef, useState } from "react";
import { addTask } from "../tasks/actions";
import { assignCareTeam } from "./actions";

export type Option = { id: string; label: string };

const input: React.CSSProperties = {
  padding: "7px 9px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--paper)",
  fontSize: 13,
  fontFamily: "inherit",
};

/** "Add task" form. Resets after a successful submit. */
export function AddTaskForm({
  practitioners,
  patients,
}: {
  practitioners: Option[];
  patients: Option[];
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addTask(fd);
        ref.current?.reset();
      }}
      style={{ display: "grid", gap: 8 }}
    >
      <input name="title" placeholder="Task…" required style={input} />
      <input name="detail" placeholder="Detail (optional)" style={input} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select name="assignee_id" defaultValue="" style={input}>
          <option value="">Unassigned</option>
          {practitioners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select name="patient_id" defaultValue="" style={input}>
          <option value="">No patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label
          className="muted"
          style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}
        >
          Due
          <input type="datetime-local" name="due_at" style={input} />
        </label>
        <button className="btn" type="submit" style={{ fontSize: 12 }}>
          Add task
        </button>
      </div>
    </form>
  );
}

/** Assign a practitioner to a patient's care team (with optional approve rights). */
export function CareTeamAssign({
  practitioners,
  patients,
}: {
  practitioners: Option[];
  patients: Option[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        className="btn ghost"
        style={{ fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        Assign care team
      </button>
    );
  }

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await assignCareTeam(fd);
        ref.current?.reset();
        setOpen(false);
      }}
      style={{ display: "grid", gap: 8 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select name="patient_id" defaultValue="" required style={input}>
          <option value="" disabled>
            Patient…
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select name="practitioner_id" defaultValue="" required style={input}>
          <option value="" disabled>
            Practitioner…
          </option>
          {practitioners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input name="role" placeholder="Role (e.g. lead)" style={input} />
        <label
          className="muted"
          style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}
        >
          <input type="checkbox" name="can_approve" /> Can approve
        </label>
        <button className="btn" type="submit" style={{ fontSize: 12 }}>
          Assign
        </button>
        <button
          type="button"
          className="btn ghost"
          style={{ fontSize: 12 }}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
