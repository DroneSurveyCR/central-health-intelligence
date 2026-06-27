import { createClient } from "@/lib/supabase/server";

export type CurrentPractice = {
  id: string;
  name: string;
  plan: string;
  modules: string[];
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string;
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
    .select("id, name, plan, modules, stripe_customer_id, stripe_connect_account_id, stripe_connect_status")
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
    role: (prac.role as string | null) ?? null,
  };
}
