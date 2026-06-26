"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const PRIMARY: [string, string][] = [
  ["/today", "today"],
  ["/plan", "plan"],
  ["/progress", "progress"],
  ["/body", "body"],
  ["/book", "book"],
  ["/appointments", "appointments"],
];
const MORE: [string, string][] = [
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

export default function PatientNav() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
            {MORE.map(([href, key]) => (
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
