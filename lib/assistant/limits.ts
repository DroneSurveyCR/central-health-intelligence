import { createAdminClient } from "@/lib/supabase/admin";

// The patient assistant's daily question cap. Configurable per practice via
// practices.settings.assistant_daily_limit (super-admin), default 20/day.
// Distinct from the hourly anti-abuse throttle in the assistant route — this is
// a product-tier limit, not a burst guard, and it resets on a rolling 24h window.

export const DEFAULT_DAILY_LIMIT = 20;

export async function getAssistantDailyLimit(practiceId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("practices").select("settings").eq("id", practiceId).maybeSingle();
  const raw = (data?.settings as Record<string, unknown> | null)?.assistant_daily_limit;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_LIMIT;
}
