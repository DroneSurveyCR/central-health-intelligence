"use client";

import { LANGS, type Lang } from "@/lib/i18n/dictionary";
import { useLang } from "@/lib/i18n/LanguageContext";

/**
 * Compact EN | ES pill toggle. On-brand: uses the berry accent for the
 * active segment and the existing --line / --muted tokens for the rest.
 * Self-contained inline styles so it needs no new CSS.
 */
export default function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1.5px solid var(--line)",
        borderRadius: 999,
        overflow: "hidden",
        fontSize: 12.5,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {LANGS.map((code: Lang) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) setLang(code);
            }}
            style={{
              border: 0,
              cursor: active ? "default" : "pointer",
              padding: "5px 11px",
              background: active ? "var(--berry)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
