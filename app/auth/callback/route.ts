import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Magic-link / OAuth code exchange. After establishing the session:
 * - staff (have a practitioners row) -> /focus
 * - patients -> ensure a patients row exists (self-serve bind/create) -> next
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  // Open-redirect hardening: only allow local paths ("/foo"), never absolute
  // URLs or protocol-relative ("//evil.com") targets.
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/home";

  const supabase = await createClient();

  // Support both magic-link flows:
  //  - PKCE (?code) — browser-initiated signInWithOtp
  //  - token-hash (?token_hash&type) — Supabase email templates / admin links
  // Only allow known, safe OTP types through verifyOtp.
  const ALLOWED_OTP_TYPES: EmailOtpType[] = [
    "magiclink",
    "email",
    "recovery",
    "signup",
    "invite",
    "email_change",
  ];

  let authError = null;
  if (code) {
    ({ error: authError } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && otpType) {
    if (!ALLOWED_OTP_TYPES.includes(otpType as EmailOtpType))
      return NextResponse.redirect(`${origin}/login?error=invalid_type`);
    ({ error: authError } = await supabase.auth.verifyOtp({
      type: otpType as EmailOtpType,
      token_hash: tokenHash,
    }));
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }
  if (authError)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError.message)}`,
    );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=no_user`);

  // Staff?
  const { data: prac } = await supabase
    .from("practitioners")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (prac) return NextResponse.redirect(`${origin}/focus`);

  // Patient self-serve: bind an existing row by email, else create one.
  await ensurePatient(user.id, user.email ?? undefined);
  return NextResponse.redirect(`${origin}${next}`);
}

async function ensurePatient(authUserId: string, email?: string) {
  const admin = createAdminClient();

  const { data: bound } = await admin
    .from("patients")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (bound) return;

  if (email) {
    const { data: byEmail } = await admin
      .from("patients")
      .select("id, auth_user_id")
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();
    if (byEmail && !byEmail.auth_user_id) {
      await admin
        .from("patients")
        .update({ auth_user_id: authUserId })
        .eq("id", byEmail.id);
      return;
    }
  }

  await admin.from("patients").insert({
    auth_user_id: authUserId,
    email: email ?? null,
    first_name: "",
    last_name: "",
  });
}
