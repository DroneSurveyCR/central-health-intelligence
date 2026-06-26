"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

async function adminClient() {
  await requireStaff(["doctor", "admin"]);
  return createClient();
}

function s(fd: FormData, k: string) {
  const v = fd.get(k);
  return v == null ? null : String(v).trim() || null;
}

export async function updatePractice(fd: FormData) {
  const supabase = await adminClient();
  const { data: row } = await supabase
    .from("practice_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  const patch = {
    name: s(fd, "name") ?? "My Practice",
    legal_name: s(fd, "legal_name"),
    tagline: s(fd, "tagline"),
    about: s(fd, "about"),
    email_from: s(fd, "email_from"),
    contact_json: {
      email: s(fd, "contact_email"),
      phone: s(fd, "contact_phone"),
      city: s(fd, "contact_city"),
      country: s(fd, "contact_country"),
    },
    social_json: {
      instagram: s(fd, "instagram"),
      website: s(fd, "website"),
    },
  };
  // Pricing/tax fields are submitted by the dedicated pricing form (below);
  // only patch them when present so the about form doesn't clear them.
  if (fd.has("tax_rate")) {
    Object.assign(patch, {
      tax_rate: fd.get("tax_rate") ? Number(fd.get("tax_rate")) : 0,
      tax_label: s(fd, "tax_label") ?? "Tax",
      currency: s(fd, "currency") ?? "USD",
    });
  }
  // Multi-tenant: practice_settings is one row PER practice (the `singleton`
  // column was dropped). The row already exists for the logged-in practice and
  // is the only row RLS returns, so update it in place rather than inserting.
  if (row?.id) {
    await supabase.from("practice_settings").update(patch).eq("id", row.id);
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function addLocation(fd: FormData) {
  const supabase = await adminClient();
  await supabase.from("locations").insert({
    name: s(fd, "name") ?? "New location",
    address: s(fd, "address"),
  });
  revalidatePath("/settings");
}

export async function deleteLocation(fd: FormData) {
  const supabase = await adminClient();
  await supabase.from("locations").delete().eq("id", String(fd.get("id")));
  revalidatePath("/settings");
}

export async function addStaff(fd: FormData) {
  const supabase = await adminClient();
  await supabase.from("practitioners").insert({
    name: s(fd, "name") ?? "New staff",
    email: (s(fd, "email") ?? "").toLowerCase(),
    role: (s(fd, "role") ?? "assistant") as string,
    title: s(fd, "title"),
    specialties: s(fd, "specialties"),
  });
  revalidatePath("/settings");
}

export async function deleteStaff(fd: FormData) {
  const supabase = await adminClient();
  await supabase.from("practitioners").delete().eq("id", String(fd.get("id")));
  revalidatePath("/settings");
}

export async function addService(fd: FormData) {
  const supabase = await adminClient();
  const price = fd.get("price") ? Number(fd.get("price")) : null;
  const firstVisit = fd.get("first_visit_price")
    ? Number(fd.get("first_visit_price"))
    : null;
  await supabase.from("services").insert({
    name: s(fd, "name") ?? "New service",
    category: s(fd, "category"),
    description: s(fd, "description"),
    price,
    first_visit_price: firstVisit,
    taxable: fd.get("taxable") != null,
  });
  revalidatePath("/settings");
}

/** Update pricing fields on an existing service row (price, first-visit tier, taxable). */
export async function updateService(fd: FormData) {
  const supabase = await adminClient();
  const id = String(fd.get("id"));
  if (!id) return;
  await supabase
    .from("services")
    .update({
      price: fd.get("price") ? Number(fd.get("price")) : null,
      first_visit_price: fd.get("first_visit_price")
        ? Number(fd.get("first_visit_price"))
        : null,
      taxable: fd.get("taxable") != null,
    })
    .eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/book");
}

export async function deleteService(fd: FormData) {
  const supabase = await adminClient();
  await supabase.from("services").delete().eq("id", String(fd.get("id")));
  revalidatePath("/settings");
}

/** Called by the client MediaUploader after a file lands in the `branding` bucket. */
export async function saveBranding(kind: "logo" | "hero" | "video", url: string) {
  const supabase = await adminClient();
  const { data: row } = await supabase
    .from("practice_settings")
    .select("id, hero_images, videos")
    .limit(1)
    .maybeSingle();
  if (!row) return;
  if (kind === "logo") {
    await supabase.from("practice_settings").update({ logo_url: url }).eq("id", row.id);
  } else if (kind === "hero") {
    await supabase
      .from("practice_settings")
      .update({ hero_images: [...(row.hero_images ?? []), url] })
      .eq("id", row.id);
  } else {
    await supabase
      .from("practice_settings")
      .update({ videos: [...(row.videos ?? []), url] })
      .eq("id", row.id);
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
