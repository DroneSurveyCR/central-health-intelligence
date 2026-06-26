import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { KIND_LABELS, type DraftKind } from "@/lib/ai/drafts";
import DraftActions from "./DraftActions";

type DraftStatus = "pending" | "approved" | "rejected" | "edited";

const STATUS_LABEL: Record<DraftStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  edited: "Edited",
};

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export default async function ApprovalsPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_drafts")
    .select(
      "id, kind, status, draft_content, edited_content, model, created_at, reviewed_at, patients(first_name,last_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = data ?? [];
  // Pending first, then everything else (both already date-desc within group).
  const sorted = [...rows].sort((a, b) => {
    const ap = a.status === "pending" ? 0 : 1;
    const bp = b.status === "pending" ? 0 : 1;
    return ap - bp;
  });
  const pendingCount = rows.filter((r) => r.status === "pending").length;

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
          {pendingCount} pending
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            No AI drafts yet. Drafts appear here when a module enqueues one for
            review.
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
          {sorted.map((r) => {
            const pt = r.patients as
              | { first_name?: string; last_name?: string }
              | null;
            const status = r.status as DraftStatus;
            const kindLabel =
              KIND_LABELS[r.kind as DraftKind] ?? (r.kind as string);
            const content =
              (r.edited_content as string | null) ??
              (r.draft_content as string | null) ??
              "";
            const name =
              `${pt?.first_name ?? ""} ${pt?.last_name ?? ""}`.trim() ||
              "Unknown patient";
            return (
              <li key={r.id as string} className="card">
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
                  <span
                    className={`badge ${status === "pending" ? "new" : "existing"}`}
                    style={{ fontSize: 11 }}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {r.model ? `${r.model as string} · ` : ""}
                  {fmtDate(r.created_at as string | null)}
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

                {status === "pending" ? (
                  <div style={{ marginTop: 12 }}>
                    <DraftActions
                      draftId={r.id as string}
                      initialContent={content}
                    />
                  </div>
                ) : (
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginTop: 12 }}
                  >
                    {STATUS_LABEL[status]}
                    {r.reviewed_at
                      ? ` · ${fmtDate(r.reviewed_at as string | null)}`
                      : ""}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
