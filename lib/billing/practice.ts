import { createClient } from "@/lib/supabase/server";

export type CurrentPractice = {
  id: string;
  name: string;
  plan: string;
  modules: string[];
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string;
  setup_fee_paid_at: string | null;
  role: string | null;
};

/** The current practitioner's practice + billing fields + caller's role. */
export async function getCurrentPractice(): Promise<CurrentPractice | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const { data: prac } = await supabase
    .from("practitioners")
    .select("practice_id, role")
    .eq("auth_user_id", uid)
    .eq("active", true)
    .maybeSingle();
  if (!prac?.practice_id) return null;

  const { data: pr } = await supabase
    .from("practices")
    .select("id, name, plan, modules, stripe_customer_id, stripe_connect_account_id, stripe_connect_status, setup_fee_paid_at")
    .eq("id", prac.practice_id)
    .maybeSingle();
  if (!pr) return null;

  return {
    id: pr.id as string,
    name: (pr.name as string) ?? "",
    plan: (pr.plan as string) ?? "starter",
    modules: (pr.modules as string[]) ?? [],
    stripe_customer_id: (pr.stripe_customer_id as string | null) ?? null,
    stripe_connect_account_id: (pr.stripe_connect_account_id as string | null) ?? null,
    stripe_connect_status: (pr.stripe_connect_status as string) ?? "disconnected",
    setup_fee_paid_at: (pr.setup_fee_paid_at as string | null) ?? null,
    role: (prac.role as string | null) ?? null,
  };
}

/**
 * Count active practitioners (providers) for a practice — used as the per-provider
 * SEAT quantity on the plan subscription. Always returns at least 1.
 */
export async function countProviderSeats(practiceId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("practitioners")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", practiceId)
    .eq("active", true);
  return Math.max(1, count ?? 1);
}
