import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import ArticleEditor from "./ArticleEditor";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  published: boolean;
  sort_order: number | null;
};

export default async function ArticlesAdminPage() {
  await requireStaff(["doctor", "admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, category, published, sort_order")
    .order("sort_order", { ascending: true });

  const articles = (data ?? []) as Article[];

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Articles
      </h1>
      <p className="muted">
        Manage the patient Education Hub. Add or update articles below.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 12px" }}>
          All articles
        </h2>
        {articles.length === 0 ? (
          <p className="muted">No articles yet — add your first one below.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {articles.map((a) => (
              <li
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <span>
                  <b>{a.title}</b>{" "}
                  <span className="muted">
                    {a.category ?? "Uncategorized"} · /{a.slug}
                  </span>
                </span>
                <span className={`badge ${a.published ? "existing" : "new"}`}>
                  {a.published ? "Published" : "Draft"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 12px" }}>
          Add an article
        </h2>
        <ArticleEditor />
      </section>
    </div>
  );
}
