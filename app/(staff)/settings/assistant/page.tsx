import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DAILY_LIMIT } from "@/lib/assistant/limits";
import AssistantLimitForm from "./AssistantLimitForm";

export default async function AssistantSettingsPage() {
  await requireStaff(["doctor", "admin"]);
  const supabase = await createClient();
  const { data: practice } = await supabase.from("practices").select("settings").limit(1).maybeSingle();
  const current =
    Number((practice?.settings as Record<string, unknown> | null)?.assistant_daily_limit) || DEFAULT_DAILY_LIMIT;

  return (
    <div style={{ maxWidth: 720 }}>
      <Link href="/settings" className="muted" style={{ fontSize: 13 }}>← Settings</Link>
      <h1 className="serif" style={{ fontSize: 28, margin: "10px 0 4px" }}>Patient AI assistant</h1>
      <p className="muted">
        Control how many questions a patient can ask the AI assistant each day. This is separate from the
        short-term anti-abuse limit, which always applies.
      </p>
      <div style={{ marginTop: 18 }}>
        <AssistantLimitForm current={current} />
      </div>
    </div>
  );
}
