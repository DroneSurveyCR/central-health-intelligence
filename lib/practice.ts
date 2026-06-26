import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Practice = {
  id: string;
  name: string;
  legal_name: string | null;
  tagline: string | null;
  about: string | null;
  contact_json: Record<string, unknown>;
  social_json: Record<string, unknown>;
  logo_url: string | null;
  hero_images: string[];
  videos: string[];
  brand_tokens: Record<string, string>;
  timezone: string;
  email_from: string | null;
};

/** The singleton practice settings (public-readable). */
export async function getPractice(): Promise<Practice | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  return (data as Practice) ?? null;
}

export async function getLocations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .order("sort_order");
  return data ?? [];
}

export async function getServices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("sort_order");
  return data ?? [];
}

/** Staff list for the admin Settings screen (runs as staff; RLS-allowed). */
export async function getStaff() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practitioners")
    .select("id, name, email, role, title, specialties, photo_url, active, public_visible, sort_order")
    .order("sort_order");
  return data ?? [];
}

/** Public-safe staff (no email) for patient/About pages — via admin client, safe columns only. */
export async function getPublicStaff() {
  // TODO(multi-tenant): scope to practice via subdomain
  const admin = createAdminClient();
  const { data } = await admin
    .from("practitioners")
    .select("id, name, title, bio, specialties, photo_url, sort_order")
    .eq("public_visible", true)
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}
