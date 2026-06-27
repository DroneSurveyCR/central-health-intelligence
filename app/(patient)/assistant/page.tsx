import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPatient } from "@/lib/auth/roles";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { aiEnabled } from "@/lib/ai";
import AssistantChat from "./AssistantChat";

export default async function AssistantPage() {
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  // Gate: the assistant lives under the `engagement` module. If the practice
  // doesn't have it, show an upgrade note rather than the chat.
  const modules = await getEnabledModules();
  if (!modules.has("engagement")) {
    return (
      <div style={{ maxWidth: 680 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px" }}>
          Assistant
        </h1>
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            The patient assistant is part of the{" "}
            <strong>engagement</strong> add-on, which isn't enabled for your
            clinic yet.
          </p>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Ask your clinic if you'd like access, or{" "}
            <Link href="/messages">message your care team</Link>.
          </p>
        </div>
      </div>
    );
  }

  await logAudit({ action: "view", resource: "assistant", patientId: me.id });

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Assistant
      </h1>
      <p className="muted" style={{ maxWidth: 560 }}>
        A supervised assistant grounded in your own data and your clinic's
        approved library. It won't give dosing advice, diagnose, or change your
        care plan — your care team does that.
      </p>

      <div className="card" style={{ marginTop: 18 }}>
        <AssistantChat aiEnabled={aiEnabled} />
      </div>
    </div>
  );
}
