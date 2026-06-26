import { requirePatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import IntakeWizard from "./IntakeWizard";

export default async function IntakePage() {
  const patient = await requirePatient();
  const supabase = await createClient();
  const { data: intake } = await supabase
    .from("intake_forms")
    .select("form_data, current_step, completed")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        Your intake
      </h1>
      <p className="muted" style={{ marginBottom: 18 }}>
        Take your time — your answers save as you go, so you can stop and come back.
      </p>
      <IntakeWizard
        initialData={(intake?.form_data as Record<string, unknown>) ?? {}}
        initialStep={intake?.current_step ?? 0}
      />
    </div>
  );
}
