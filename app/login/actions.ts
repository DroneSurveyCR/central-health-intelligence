"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const TOO_MANY = "Too+many+attempts.+Please+try+again+in+a+few+minutes.";

/** Patient self-serve sign-in: passwordless magic link. */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) redirect("/login?error=Enter+your+email");

  const ip = clientIp(await headers());
  const okEmail = await rateLimit(`login:email:${email}`, 5, 900); // 5 / 15 min per email
  const okIp = await rateLimit(`login:ip:${ip}`, 30, 900); // 30 / 15 min per IP
  if (!okEmail || !okIp) redirect(`/login?error=${TOO_MANY}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/home`,
    },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

/** Staff sign-in: password (MFA challenge handled after enrollment — see M2). */
export async function signInStaff(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  const ip = clientIp(await headers());
  const okEmail = await rateLimit(`staff-login:email:${email}`, 10, 900); // 10 / 15 min per email
  const okIp = await rateLimit(`staff-login:ip:${ip}`, 15, 900); // 15 / 15 min per IP
  if (!okEmail || !okIp) redirect(`/login?tab=staff&error=${TOO_MANY}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    redirect(`/login?tab=staff&error=${encodeURIComponent(error.message)}`);

  // Step up to MFA if a factor is enrolled (no factor yet → straight in).
  let needsMfa = false;
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa = aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";
  } catch {
    needsMfa = false;
  }
  redirect(needsMfa ? "/mfa" : "/focus");
}
