import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by Postgres (no external store).
 * Returns true when the action is ALLOWED.
 *
 * By default fails OPEN (allows) on a limiter error so a hiccup never locks out
 * legitimate users. For the UNAUTHENTICATED abuse surface (signup, login) pass
 * `{ failClosed: true }` — under DB pressure it's safer to block than to drop
 * all throttling on a public, service-role-backed endpoint.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  opts?: { failClosed?: boolean },
): Promise<boolean> {
  const onError = opts?.failClosed ? false : true;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return onError;
    return data === true;
  } catch {
    return onError;
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] || headers.get("x-real-ip") || "unknown").trim();
}
