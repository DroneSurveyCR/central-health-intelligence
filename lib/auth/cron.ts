import { timingSafeEqual } from "crypto";

/**
 * Authorize a Vercel Cron request via the `Authorization: Bearer <CRON_SECRET>` header,
 * compared in constant time. HEADER-ONLY by design — never accept the secret in the query
 * string: full request URLs land in access/proxy logs, leaking a long-lived shared secret.
 */
export function authorizeCron(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
