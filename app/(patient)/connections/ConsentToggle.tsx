"use client";

import { useState, useTransition } from "react";
import { setConsent, type ConsentDomain, type ConsentScope } from "./actions";

/**
 * Two-state segmented control for one data domain. Optimistically flips, calls
 * the server action (RLS upsert), and reverts on failure. The server action
 * revalidates /connections so the authoritative value re-renders.
 */
export default function ConsentToggle({
  domain,
  scope,
}: {
  domain: ConsentDomain;
  scope: ConsentScope;
}) {
  const [value, setValue] = useState<ConsentScope>(scope);
  const [pending, startTransition] = useTransition();

  function choose(next: ConsentScope) {
    if (next === value || pending) return;
    const prev = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setConsent(domain, next);
      } catch {
        setValue(prev);
      }
    });
  }

  return (
    <div
      role="group"
      aria-label={`Sharing for ${domain}`}
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: 2,
        background: "var(--paper, #faf7f2)",
        opacity: pending ? 0.6 : 1,
      }}
    >
      <Segment active={value === "clinic"} onClick={() => choose("clinic")}>
        Shared with clinic
      </Segment>
      <Segment active={value === "private"} onClick={() => choose("private")}>
        Private to me
      </Segment>
    </div>
  );
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        border: "none",
        cursor: "pointer",
        borderRadius: 999,
        padding: "6px 13px",
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        color: active ? "#fff" : "var(--ink)",
        background: active ? "var(--berry)" : "transparent",
        transition: "background 0.12s",
      }}
    >
      {children}
    </button>
  );
}
