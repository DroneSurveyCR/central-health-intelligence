import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  body: string | null;
  read_minutes: number | null;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("title, excerpt, body")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  const article = data as { title?: string | null; excerpt?: string | null; body?: string | null } | null;

  if (!article) {
    return { title: "Article not found · Central Health Intelligence" };
  }

  const title = `${article.title ?? "Article"} · Central Health Intelligence`;
  const snippet = (article.excerpt ?? article.body ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const description = snippet || "Read this article on Central Health Intelligence.";

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getServerLang();
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, category, body, read_minutes")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  const article = data as Article | null;

  if (!article) {
    return (
      <div style={{ maxWidth: 680 }}>
        <Link className="btn ghost" href="/learn" style={{ textDecoration: "none" }}>
          {t("learn_back", lang)}
        </Link>
        <div className="card" style={{ marginTop: 18 }}>
          <h1 className="serif" style={{ fontSize: 24, margin: "0 0 6px" }}>
            {t("learn_not_found", lang)}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("learn_not_found_body", lang)}
          </p>
        </div>
      </div>
    );
  }

  const paragraphs = (article.body ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article style={{ maxWidth: 680 }}>
      <Link className="btn ghost" href="/learn" style={{ textDecoration: "none" }}>
        {t("learn_back", lang)}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        {article.category && <span style={chipStyle}>{article.category}</span>}
        <span className="muted" style={{ fontSize: 12.5 }}>
          {article.read_minutes ?? 5} {t("learn_min_read", lang)}
        </span>
      </div>

      <h1 className="serif" style={{ fontSize: 30, margin: "10px 0 18px" }}>
        {article.title}
      </h1>

      {paragraphs.length === 0 ? (
        <p className="muted">{t("learn_no_content", lang)}</p>
      ) : (
        paragraphs.map((p, i) => (
          <p key={i} style={{ lineHeight: 1.7, fontSize: 16, margin: "0 0 16px" }}>
            {p}
          </p>
        ))
      )}
    </article>
  );
}
