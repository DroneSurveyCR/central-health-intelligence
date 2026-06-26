import { createClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE client — bypasses RLS. SERVER-ONLY.
 * Never import into a Client Component. Use only for: seeding,
 * the cron reminder job, and the token-authorized iCal feed.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
