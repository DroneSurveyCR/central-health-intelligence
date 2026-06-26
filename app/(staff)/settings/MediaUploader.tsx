"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { saveBranding } from "./actions";

export default function MediaUploader({
  kind,
  label,
}: {
  kind: "logo" | "hero" | "video";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("Uploading…");
    const supabase = createClient();
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `${kind}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    await saveBranding(kind, data.publicUrl);
    setMsg("Saved ✓");
    setBusy(false);
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
      <span>{label}</span>
      <input
        type="file"
        accept={kind === "video" ? "video/*" : "image/*"}
        onChange={onFile}
        disabled={busy}
      />
      {msg && <em className="hint">{msg}</em>}
    </label>
  );
}
