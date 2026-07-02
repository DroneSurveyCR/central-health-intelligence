"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Article = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  published: boolean;
  sort_order: number | null;
};

/** The articles list with a per-row publish/unpublish toggle — the "disable it" control. */
export default function ArticleList({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function toggle(a: Article) {
    setBusyId(a.id);
    setErr("");
    try {
      const res = await fetch("/api/article", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: a.id, published: !a.published }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Update failed.");
      else router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  if (articles.length === 0) return <p className="muted">No articles yet — add your first one below.</p>;

  return (
    <div>
      {err && <p style={{ color: "var(--rust, #c0392b)", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {articles.map((a) => (
          <li
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <span>
              <b>{a.title}</b> <span className="muted">{a.category ?? "Uncategorized"} · /{a.slug}</span>
            </span>
            <button
              type="button"
              disabled={busyId === a.id}
              onClick={() => toggle(a)}
              className={`badge ${a.published ? "existing" : "new"}`}
              style={{ border: "none", cursor: "pointer" }}
              title={a.published ? "Click to unpublish (removes it from AI grounding)" : "Click to publish"}
            >
              {busyId === a.id ? "…" : a.published ? "Published" : "Draft"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
