import { cookies } from "next/headers";
import type { Lang } from "./dictionary";

/**
 * Server helper to read the "lang" cookie in server components / route handlers.
 *
 * In Next.js 15 `cookies()` is async, so this returns a Promise<Lang>.
 * Defaults to "en" when the cookie is missing or invalid.
 *
 * Usage in a server component:
 *   const lang = await getServerLang();
 *   <Link href="/today">{t("today", lang)}</Link>
 */
export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get("lang")?.value;
  return value === "es" ? "es" : "en";
}
