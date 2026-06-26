import { requireStaff } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import ImportReview from "./ImportReview";

export default async function ImportReviewPage({ params }: { params: Promise<{ importId: string }> }) {
  await requireStaff();
  const { importId } = await params;
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("health_data_imports")
    .select("*, patients(first_name, last_name), connector_registry(label, target_table)")
    .eq("id", importId)
    .maybeSingle();

  if (!job) return <p className="muted">Import not found.</p>;

  return <ImportReview job={job} />;
}
