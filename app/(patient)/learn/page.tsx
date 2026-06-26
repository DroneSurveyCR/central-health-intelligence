import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  excerpt: string | null;
  read_minutes: number | null;
  sort_order: number | null;
};

const chipStyle = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase" as const,
  color: "var(--berry)",
  background: "var(--sand)",
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "3px 10px",
};

export default async function LearnPage() {
  const lang = await getServerLang();
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, category, excerpt, read_minutes, sort_order")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  const articles = (data ?? []) as Article[];

  // Group by category, preserving sort order within each group.
  const moreLabel = t("learn_more", lang);
  const groups = new Map<string, Article[]>();
  for (const a of articles) {
    const key = a.category ?? moreLabel;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--sand), #fffdf8)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          padding: "30px 28px",
        }}
      >
        <span style={chipStyle}>{t("learn_hub", lang)}</span>
        <h1 className="serif" style={{ fontSize: 32, margin: "12px 0 6px" }}>
          {t("learn_title", lang)}
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
          {t("learn_subtitle", lang)}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="card" style={{ marginTop: 24 }}>
          <p style={{ margin: 0 }} className="muted">
            {t("learn_empty", lang)}
          </p>
        </div>
      ) : (
        [...groups.entries()].map(([category, list]) => (
          <section key={category} style={{ marginTop: 32 }}>
            <h2 className="serif" style={{ fontSize: 21, margin: "0 0 12px" }}>
              {category}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                gap: 16,
              }}
            >
              {list.map((a) => (
                <Link
                  key={a.id}
                  href={`/learn/${a.slug}`}
                  className="card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: 18,
                  }}
                >
                  <span style={chipStyle}>{a.category ?? moreLabel}</span>
                  <h3 className="serif" style={{ fontSize: 18, margin: 0 }}>
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p
                      className="muted"
                      style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}
                    >
                      {a.excerpt}
                    </p>
                  )}
                  <span
                    className="muted"
                    style={{ fontSize: 12.5, marginTop: "auto" }}
                  >
                    {a.read_minutes ?? 5} {t("learn_min_read", lang)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
