// Re-invite Casa Elev8 staff: the ETL nulled practitioners.auth_user_id, so only
// the demo logins work. This links each active practitioner (with an email + no
// auth user) to a fresh auth user with a temp password they reset on first login.
// Run: node --env-file=.env scripts/reinvite-staff.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });

const { data: pracs } = await admin
  .from("practitioners")
  .select("id, name, email, role, auth_user_id, active")
  .eq("practice_id", ELEV8)
  .is("auth_user_id", null)
  .eq("active", true);

const candidates = (pracs ?? []).filter((p) => p.email && p.email.includes("@"));
console.log(`practitioners needing a login: ${candidates.length}`);
if (!candidates.length) process.exit(0);

const { data: existing } = await admin.auth.admin.listUsers();
const byEmail = new Map((existing?.users ?? []).map((u) => [u.email?.toLowerCase(), u.id]));

const creds = [];
for (const p of candidates) {
  const email = p.email.toLowerCase();
  let uid = byEmail.get(email);
  const pw = `HS-${crypto.randomBytes(4).toString("hex")}!`;
  if (uid) {
    await admin.auth.admin.updateUserById(uid, { password: pw });
  } else {
    const { data: c, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (error) { console.log(`  SKIP ${email}: ${error.message.slice(0, 50)}`); continue; }
    uid = c.user.id;
  }
  await admin.from("practitioners").update({ auth_user_id: uid }).eq("id", p.id);
  creds.push({ name: p.name, email, role: p.role, tempPassword: pw });
}

console.log(`\nlinked ${creds.length} staff logins (distribute securely; they should reset on first login):\n`);
for (const c of creds) console.log(`  ${c.role.padEnd(10)} ${c.email.padEnd(34)} ${c.tempPassword}   (${c.name})`);
