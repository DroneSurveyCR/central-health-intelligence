// Create/refresh a working login into practice #1 (Casa Elev8) for demoing the live app.
// Links the auth user to Randi's existing practitioner row. Run: node --env-file=.env scripts/demo-login.mjs
import { createClient } from "@supabase/supabase-js";

const ELEV8 = "11111111-1111-1111-1111-111111111111";
const admin = createClient(process.env.DEST_URL, process.env.DEST_SERVICE_KEY, { auth: { persistSession: false } });
const EMAIL = "randi@elev8.health";
const PW = "HealthSync-Demo-2026!";

let uid;
const { data: c, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true });
if (error && String(error.message).includes("already")) {
  const { data } = await admin.auth.admin.listUsers();
  uid = data.users.find((u) => u.email === EMAIL)?.id;
  if (uid) await admin.auth.admin.updateUserById(uid, { password: PW });
} else {
  uid = c?.user?.id;
}

const { data: prac, error: uerr } = await admin
  .from("practitioners")
  .update({ auth_user_id: uid })
  .eq("practice_id", ELEV8)
  .eq("email", EMAIL)
  .select("id, name, role")
  .maybeSingle();

console.log("auth user:", uid ? "ready" : "FAILED");
if (prac) {
  console.log("linked practitioner:", `${prac.name} (${prac.role})`);
} else {
  const { data: np } = await admin
    .from("practitioners")
    .insert({ practice_id: ELEV8, auth_user_id: uid, name: "Dr. Randi Raymond", email: EMAIL, role: "doctor", active: true })
    .select("name")
    .maybeSingle();
  console.log("created practitioner:", np?.name, uerr ? `(update miss: ${uerr.message})` : "");
}
console.log("\nLOGIN  ->  " + EMAIL + "  /  " + PW);
