"use client";

import { useState } from "react";

type Row = {
  first_name: string;
  last_name: string;
  email: string;
  sex: string;
  dob: string;
};

type ParsedRow = Row & { _errors: string[] };

type ResultRow = {
  email: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

const SEX_VALUES = ["male", "female", "other", "undisclosed"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hand-rolled CSV parser: handles quoted fields, escaped quotes ("") and commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // Handle CRLF: skip the \n that follows a \r
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Flush trailing field/row if any content remains.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows (e.g. trailing blank line).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function validateRow(r: Row): string[] {
  const errors: string[] = [];
  if (!r.first_name.trim() && !r.last_name.trim()) errors.push("name required");
  if (!r.email.trim()) errors.push("email required");
  else if (!EMAIL_RE.test(r.email.trim())) errors.push("invalid email");
  if (r.sex && !SEX_VALUES.includes(r.sex.toLowerCase()))
    errors.push("bad sex value");
  return errors;
}

export default function ImportWizard() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState("");

  function buildRows(text: string) {
    setError("");
    setResults(null);
    const grid = parseCsv(text);
    if (grid.length < 2) {
      setRows(null);
      setError("Need a header row plus at least one data row.");
      return;
    }
    const header = grid[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const iFirst = idx("first_name");
    const iLast = idx("last_name");
    const iEmail = idx("email");
    const iSex = idx("sex");
    const iDob = idx("dob");

    if (iFirst === -1 || iLast === -1 || iEmail === -1) {
      setRows(null);
      setError(
        "Header must include first_name, last_name and email columns.",
      );
      return;
    }

    const at = (cells: string[], i: number) =>
      i === -1 ? "" : (cells[i] ?? "").trim();

    const parsed: ParsedRow[] = grid.slice(1).map((cells) => {
      const r: Row = {
        first_name: at(cells, iFirst),
        last_name: at(cells, iLast),
        email: at(cells, iEmail),
        sex: at(cells, iSex),
        dob: at(cells, iDob),
      };
      return { ...r, _errors: validateRow(r) };
    });
    setRows(parsed);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRaw(text);
      buildRows(text);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!rows) return;
    const valid = rows.filter((r) => r._errors.length === 0);
    if (valid.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: valid.map((r) => ({
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            sex: r.sex,
            dob: r.dob,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Import failed.");
      } else {
        setResults(data.results as ResultRow[]);
      }
    } catch {
      setError("Network error during import.");
    } finally {
      setBusy(false);
    }
  }

  const validCount = rows?.filter((r) => r._errors.length === 0).length ?? 0;
  const invalidCount = (rows?.length ?? 0) - validCount;

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Paste CSV
      </label>
      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          buildRows(e.target.value);
        }}
        rows={8}
        placeholder="first_name,last_name,email,sex,dob&#10;Jane,Doe,jane@example.com,female,1986-04-02"
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: 13,
          padding: 10,
          border: "1px solid var(--line)",
          borderRadius: 10,
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          margin: "10px 0",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          <span style={{ marginRight: 8 }}>…or upload a .csv file</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
        </label>
      </div>

      {error && (
        <p style={{ color: "#b42318", fontSize: 14, margin: "8px 0" }}>{error}</p>
      )}

      {rows && rows.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <h2 className="serif" style={{ fontSize: 17, margin: 0 }}>
              Preview
            </h2>
            <span
              style={{
                fontSize: 12.5,
                padding: "2px 9px",
                borderRadius: 999,
                background: "var(--sand)",
                border: "1px solid var(--line)",
              }}
            >
              {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span
                style={{
                  fontSize: 12.5,
                  padding: "2px 9px",
                  borderRadius: 999,
                  background: "#fde8e6",
                  border: "1px solid #f3c2bd",
                  color: "#b42318",
                }}
              >
                {invalidCount} with issues
              </span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13.5,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={th}>first_name</th>
                  <th style={th}>last_name</th>
                  <th style={th}>email</th>
                  <th style={th}>sex</th>
                  <th style={th}>dob</th>
                  <th style={th}>status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const ok = r._errors.length === 0;
                  return (
                    <tr key={i} style={{ background: ok ? undefined : "#fef6f5" }}>
                      <td style={td}>{r.first_name}</td>
                      <td style={td}>{r.last_name}</td>
                      <td style={td}>{r.email}</td>
                      <td style={td}>{r.sex}</td>
                      <td style={td}>{r.dob}</td>
                      <td style={td}>
                        {ok ? (
                          <span style={{ color: "var(--berry)" }}>ready</span>
                        ) : (
                          <span style={{ color: "#b42318" }}>
                            {r._errors.join(", ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            className="btn"
            style={{ marginTop: 14 }}
            disabled={busy || validCount === 0}
            onClick={doImport}
          >
            {busy ? "Importing…" : `Import ${validCount} patient${validCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {results && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="serif" style={{ fontSize: 17, margin: "0 0 10px" }}>
            Results
          </h2>
          <p className="muted" style={{ margin: "0 0 10px" }}>
            {results.filter((r) => r.status === "created").length} created ·{" "}
            {results.filter((r) => r.status === "skipped").length} skipped ·{" "}
            {results.filter((r) => r.status === "error").length} error
          </p>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}
          >
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={th}>email</th>
                <th style={th}>status</th>
                <th style={th}>detail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{r.email}</td>
                  <td style={td}>
                    <span
                      style={{
                        color:
                          r.status === "created"
                            ? "var(--berry)"
                            : r.status === "error"
                              ? "#b42318"
                              : "var(--muted, #777)",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={td} className="muted">
                    {r.message ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "2px solid var(--line)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top",
};
