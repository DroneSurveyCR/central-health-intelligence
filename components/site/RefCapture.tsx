"use client";

import { useEffect } from "react";

/**
 * Reseller attribution. When someone lands on any marketing page with `?ref=CODE`
 * (a reseller's link), persist the code so it survives navigation and is attached
 * to whatever they submit later (the intake form reads `chi_ref`). Stored in both
 * localStorage and a 30-day cookie. Last ref wins.
 */
export default function RefCapture() {
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("ref");
      if (!raw) return;
      const code = raw.trim().slice(0, 40);
      if (!code) return;
      localStorage.setItem("chi_ref", code);
      document.cookie = `chi_ref=${encodeURIComponent(code)};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
    } catch {
      /* storage may be blocked — non-fatal */
    }
  }, []);
  return null;
}
