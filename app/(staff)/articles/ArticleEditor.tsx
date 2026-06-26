"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Foundations",
  "Scans",
  "Protocols",
  "Therapies",
  "Nutrition",
];

export default function ArticleEditor() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      slug: String(fd.get("slug") || "").trim(),
      title: String(fd.get("title") || "").trim(),
      category: String(fd.get("category") || "").trim(),
      excerpt: String(fd.get("excerpt") || "").trim(),
      body: String(fd.get("body") || "").trim(),
      read_minutes: Number(fd.get("read_minutes") || 5),
    };

    const res = await fetch("/api/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.ok) {
      setMsg("Saved ✓");
      form.reset();
      router.refresh();
    } else {
      setMsg(json.error || "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>
          Title
          <input name="title" placeholder="What scans tell us" required />
        </label>
        <label>
          Slug
          <input name="slug" placeholder="what-scans-tell-us" required />
        </label>
        <label>
          Category
          <select name="category" defaultValue="Foundations">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Read minutes
          <input
            name="read_minutes"
            type="number"
            min={1}
            step={1}
            defaultValue={5}
          />
        </label>
      </div>
      <label>
        Excerpt
        <input name="excerpt" placeholder="A one-line summary for the card" />
      </label>
      <label>
        Body
        <textarea
          name="body"
          rows={8}
          placeholder="Write in paragraphs. Separate paragraphs with a blank line."
        />
      </label>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save article"}
      </button>
      {msg && <p className="hint">{msg}</p>}
      <p className="hint">
        Slug must be kebab-case (lowercase letters, numbers, hyphens). Saving an
        existing slug updates that article.
      </p>
    </form>
  );
}
