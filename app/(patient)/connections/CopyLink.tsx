"use client";

import { useState } from "react";

/**
 * Desktop → phone handoff (plan §9.2). Shows the connections URL and a button
 * that copies it so a patient on a laptop can continue on their phone, where the
 * device OAuth flow (and any companion apps) live.
 */
export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API blocked (insecure context / permissions) — fall back to a select prompt
      window.prompt("Copy this link", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <code
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          padding: "9px 12px",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--paper, #faf7f2)",
          fontSize: 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {url}
      </code>
      <button className="btn ghost" type="button" onClick={copy} style={{ flexShrink: 0 }}>
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
