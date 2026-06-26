"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount. Renders nothing.
 * Guarded so it can never break the app:
 *  - only runs in the browser when the SW API exists
 *  - only registers in production-like builds (skips dev to avoid HMR clashes)
 *  - fully wrapped in try/catch; failures are swallowed
 */
export default function PWARegister() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) return;
      // Avoid registering during local development.
      if (process.env.NODE_ENV !== "production") return;

      const register = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch(() => {
            /* registration failed — ignore, app still works */
          });
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register, { once: true });
        return () => window.removeEventListener("load", register);
      }
    } catch {
      /* never let PWA setup throw */
    }
  }, []);

  return null;
}
