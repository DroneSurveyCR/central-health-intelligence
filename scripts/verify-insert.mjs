import { createClient } from "@supabase/supabase-js";
const ELEV8 = "11111111-1111-1111-1111-111111111111";
const need = (k) => { const v = process.env[k]; if (!v) { console.error("missing " + k); process.exit(1); } return v; };
const admin = createClient(need("DEST_URL"), need("DEST_SERVICE_KEY"), { auth: { persistSession: false } });
const EMAIL = "insert-test@example.com", PW = "Insert-Test-123!", PRAC = "44444444-4444-4444-4444-444444444444";
let uid = null, labelId = null;
try {
  const { data: c } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true });
  uid = c?.user?.id || (await admin.auth.admin.listUsers()).data.users.find(u=>u.email===EMAIL)?.id;
  await admin.from("practitioners").upsert({ id: PRAC, practice_id: ELEV8, auth_user_id: uid, name: "Insert Tester", email: EMAIL, role: "doctor", active: true }, { onConflict: "id" });
  const { data: pt } = await admin.from("patients").select("id").eq("practice_id", ELEV8).limit(1).maybeSingle();
  const user = createClient(need("DEST_URL"), need("DEST_ANON_KEY"), { auth: { persistSession: false } });
  await user.auth.signInWithPassword({ email: EMAIL, password: PW });
  // INSERT omitting practice_id — the dynamic default should fill it
  const { data: ins, error } = await user.from("patient_labels").insert({ patient_id: pt.id, label: "_insert_test_" }).select("id, practice_id").maybeSingle();
  if (error) { console.error("INSERT FAILED:", error.message); process.exit(1); }
  labelId = ins.id;
  console.log("inserted label id:", ins.id);
  console.log("auto-filled practice_id:", ins.practice_id, ins.practice_id === ELEV8 ? "✓ (matches caller's practice)" : "✗ WRONG");
  console.log(ins.practice_id === ELEV8 ? "\nPASS — write path works; practice_id auto-filled correctly." : "\nFAIL");
} finally {
  if (labelId) await admin.from("patient_labels").delete().eq("id", labelId);
  await admin.from("practitioners").delete().eq("id", PRAC);
  if (uid) await admin.auth.admin.deleteUser(uid);
}
