import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { KIND_LABELS, listPendingDrafts, type DraftKind } from "@/lib/ai/drafts";
import { approveDraft, rejectDraft } from "./actions";
import DraftActions from "./DraftActions";

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export default async function ApprovalsPage() {
  await requireStaff();
  const supabase = await createClient();

  // The approval queue is the pending AI drafts for the caller's practice (RLS
  // scopes via can_access_patient). Approval is the only thing that finalizes
  // clinical AI output, so this page is the single review gate.
  const rows = await listPendingDrafts(supabase);
  await logAudit({ action: "view", resource: "approvals" });

  return (
    <div style={{ maxWidth: 820 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          AI Drafts
        </h1>
        <span className="muted" style={{ fontSize: 13 }}>
          {rows.length} pending
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            Nothing waiting for approval. AI drafts appear here when a module
            enqueues one for review.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: 18,
            display: "grid",
            gap: 12,
          }}
        >
          {rows.map((r) => {
            const kindLabel = KIND_LABELS[r.kind as DraftKind] ?? r.kind;
            const content = r.edited_content ?? r.draft_content ?? "";
            const name =
              `${r.patients?.first_name ?? ""} ${r.patients?.last_name ?? ""}`.trim() ||
              "Unknown patient";
            return (
              <li key={r.id} className="card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div className="serif" style={{ fontSize: 16 }}>
                    {name}
                    <span
                      className="badge"
                      style={{ marginLeft: 8, fontSize: 11 }}
                    >
                      {kindLabel}
                    </span>
                  </div>
                  <span className="badge new" style={{ fontSize: 11 }}>
                    Pending
                  </span>
                </div>

                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {r.model ? `${r.model} · ` : ""}
                  {fmtDate(r.created_at)}
                </div>

                <pre
                  className="serif"
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    fontSize: 14,
                    margin: "12px 0 0",
                  }}
                >
                  {content}
                </pre>

                {/* Primary review path: server-action Approve / Reject. The
                    inline editor (DraftActions) handles Save & approve edits. */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <form action={approveDraft}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn" type="submit" style={{ fontSize: 12 }}>
                      Approve
                    </button>
                  </form>
                  <form action={rejectDraft}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      className="btn ghost"
                      type="submit"
                      style={{ fontSize: 12 }}
                    >
                      Reject
                    </button>
                  </form>
                  <span className="muted" style={{ fontSize: 11 }}>
                    or
                  </span>
                  <DraftActions
                    draftId={r.id}
                    initialContent={content}
                    editOnly
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
