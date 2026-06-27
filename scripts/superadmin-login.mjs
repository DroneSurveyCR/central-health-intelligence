// Create/refresh the PLATFORM super-admin login (no practice — sees all tenants via /superadmin).
// The email must also be in SUPERADMIN_EMAILS. Run: node --env-file=.env scripts/superadmin-login.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });
const EMAIL = "personalhealthintelligence@gmail.com";
const PW = "PHI-Platform-Owner-2026!";

let uid;
const { data: c, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true });
if (error && String(error.message).includes("already")) {
  const { data } = await admin.auth.admin.listUsers();
  uid = data.users.find((u) => u.email === EMAIL)?.id;
  if (uid) await admin.auth.admin.updateUserById(uid, { password: PW });
} else {
  uid = c?.user?.id;
}
console.log("super-admin auth user:", uid ? "ready" : "FAILED");
console.log("\nSUPER-ADMIN LOGIN  ->  " + EMAIL + "  /  " + PW);
console.log("(must also be listed in SUPERADMIN_EMAILS env)");
