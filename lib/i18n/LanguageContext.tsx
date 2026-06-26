"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { type Lang, t } from "./dictionary";

const COOKIE_NAME = "lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

type LanguageContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** SSR-safe cookie read. Returns null on the server or when absent. */
function readLangCookie(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  const value = match?.split("=")[1];
  return value === "en" || value === "es" ? value : null;
}

/** SSR-safe cookie write. No-ops on the server. */
function writeLangCookie(lang: Lang): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

/**
 * Wraps the client tree and tracks the active language.
 *
 * `initialLang` should be passed from a server component (via getServerLang)
 * so the first client render matches the server-rendered HTML and avoids a
 * hydration mismatch. If omitted, it falls back to the cookie or "en".
 */
export function LanguageProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(
    () => initialLang ?? readLangCookie() ?? "en",
  );

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      writeLangCookie(next);
      // Refresh so server components re-render with the new language.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang }),
    [lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Access the current language and a setter. Must be used under LanguageProvider. */
export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLang must be used within a <LanguageProvider>");
  }
  return ctx;
}

/** Returns a translate function bound to the current language. */
export function useT(): (key: string) => string {
  const { lang } = useLang();
  return useCallback((key: string) => t(key, lang), [lang]);
}
