"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Library = { slug: string; label: string; description: string; articleCount: number };

/** Import a default, pre-researched knowledge library as real (published, editable) articles. */
export default function KnowledgeLibraries({ libraries }: { libraries: Library[] }) {
  const router = useRouter();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function importLibrary(slug: string) {
    setBusySlug(slug);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/settings/knowledge-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ librarySlug: slug }),
      });
      const json = (await res.json().catch(() => ({}))) as { count?: number; error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Import failed.");
      else {
        setMsg(`Imported ${json.count} article(s) — published and ready. Review below and disable anything that doesn't fit.`);
        router.refresh();
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusySlug(null);
    }
  }

  if (libraries.length === 0) return null;

  return (
    <section style={{ marginTop: 28 }}>
      <h2 className="serif" style={{ fontSize: 19, margin: "0 0 4px" }}>Starter knowledge libraries</h2>
      <p className="muted" style={{ fontSize: 13, margin: "0 0 14px" }}>
        Pre-researched clinical reference for your vertical, imported as real articles you can edit or disable.
        Both the doctor AI and the patient assistant ground on whatever's published here.
      </p>
      {err && <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
      {msg && <p style={{ color: "var(--berry, #14834e)", fontSize: 13, margin: "0 0 10px" }}>{msg}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {libraries.map((lib) => (
          <div
            key={lib.slug}
            className="card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}
          >
            <div>
              <b>{lib.label}</b>
              <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>{lib.description}</p>
              <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>{lib.articleCount} articles</p>
            </div>
            <button
              type="button"
              className="btn ghost"
              disabled={busySlug === lib.slug}
              onClick={() => importLibrary(lib.slug)}
              style={{ padding: "8px 16px", whiteSpace: "nowrap" }}
            >
              {busySlug === lib.slug ? "Importing…" : "Import"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
