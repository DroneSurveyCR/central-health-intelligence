"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

// Core items always rendered, regardless of which modules a practice has bought.
const PRIMARY: [string, string][] = [
  ["/today", "today"],
  ["/plan", "plan"],
  ["/progress", "progress"],
  ["/body", "body"],
  ["/book", "book"],
  ["/appointments", "appointments"],
];
const MORE_CORE: [string, string][] = [
  ["/home", "home"],
  ["/messages", "messages"],
  ["/progress", "progress"],
  ["/appointments", "appointments"],
  ["/intake", "intake"],
  ["/results", "results"],
  ["/labs", "labs"],
  ["/report", "report"],
  ["/agreements", "agreements"],
  ["/learn", "learn"],
  ["/store", "store"],
  ["/orders", "orders"],
  ["/billing", "billing"],
  ["/memberships", "memberships"],
  ["/about", "about"],
  ["/privacy", "privacy"],
];

/**
 * Module flags resolved server-side (via getEnabledModules) and passed down so
 * this client component can stay interactive while remaining module-driven.
 * Undefined props degrade to "off" — the link simply isn't shown.
 */
export type PatientNavProps = {
  /** wearables module → "Connections" (/connections) */
  wearables?: boolean;
  /** engagement module → "Assistant" (/assistant) */
  engagement?: boolean;
};

export default function PatientNav({ wearables = false, engagement = false }: PatientNavProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Build the "More" menu: core items + module-gated extras (Connections when
  // wearables is enabled, Assistant when engagement is enabled).
  const more: [string, string][] = [...MORE_CORE];
  if (wearables) more.push(["/connections", "connections"]);
  if (engagement) more.push(["/assistant", "assistant"]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <nav style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 14, flexWrap: "wrap" }}>
      <span className="pn-primary">
        {PRIMARY.map(([href, key]) => (
          <Link key={href} href={href}>
            {t(key)}
          </Link>
        ))}
      </span>
      <div
        ref={wrapRef}
        style={{ position: "relative" }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn ghost"
          style={{ padding: "4px 12px", fontSize: 14 }}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {t("more")} ▾
        </button>
        {open && (
          <div
            role="menu"
            onMouseLeave={() => setOpen(false)}
            style={{
              position: "absolute",
              right: 0,
              top: "115%",
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 8,
              display: "grid",
              gap: 2,
              minWidth: 180,
              zIndex: 50,
              boxShadow: "0 12px 34px rgba(30,58,48,.12)",
            }}
          >
            {more.map(([href, key]) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{ padding: "7px 12px", borderRadius: 8 }}
              >
                {t(key)}
              </Link>
            ))}
          </div>
        )}
      </div>
      <LanguageToggle />
    </nav>
  );
}
