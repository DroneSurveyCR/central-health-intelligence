import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listDefaultLibraries } from "@/lib/knowledge/defaultLibraries";
import ArticleEditor from "./ArticleEditor";
import ArticleList, { type Article } from "./ArticleList";
import KnowledgeLibraries from "./KnowledgeLibraries";

export default async function ArticlesAdminPage() {
  await requireStaff(["doctor", "admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, category, published, sort_order")
    .order("sort_order", { ascending: true });

  const articles = (data ?? []) as Article[];
  const libraries = listDefaultLibraries().map((l) => ({
    slug: l.slug,
    label: l.label,
    description: l.description,
    articleCount: l.articles.length,
  }));

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Articles
      </h1>
      <p className="muted">
        Manage the patient Education Hub — and what grounds the AI. Both the doctor AI and the patient
        assistant read from published articles here.
      </p>

      <KnowledgeLibraries libraries={libraries} />

      <section style={{ marginTop: 24 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 12px" }}>
          All articles
        </h2>
        <ArticleList articles={articles} />
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
